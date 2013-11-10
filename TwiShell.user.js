// ==UserScript==
// @name TwiShell
// @namespace TwiShell
// @description Enhance Twitter Web with lots of features.
// @match http://twitter.com/*
// @match https://twitter.com/*
// @version 1.4
// @run-at document-start
// @require http://code.jquery.com/jquery-2.0.3.min.js
// ==/UserScript==

//noinspection ThisExpressionReferencesGlobalObjectJS
(function (window) {
    'use strict';
    var $ = window.jQuery.noConflict(true),
        document = window.document;

    var RT = function () {
        var ELEMENT_NODE = 1,
            TEXT_NODE = 3;

        var getOriginalTweetText = function (tweetNode) {
            var originalTweetText = "",
                jTweetNode = tweetNode.jquery ? tweetNode : $(tweetNode),
                childNode,
                childNodes = jTweetNode.find("div.content p.js-tweet-text").get(0).childNodes,
                i = 0,
                text,
                screenName = jTweetNode.find("div.stream-item-header span.username").text().trim();

            for (; i < childNodes.length; i += 1) {
                text = "";
                childNode = childNodes[i];
                if (childNode.nodeType === TEXT_NODE) {
                    text = childNode.textContent;
                }
                else if (childNode.nodeType === ELEMENT_NODE) {
                    text = $(childNode).find(":not(.tco-ellipsis)").text();
                    if (!text) {
                        text = childNode.textContent;
                    }
                }
                if (text) {
                    originalTweetText += text;
                }
            }
            originalTweetText = Array.prototype.map.call(originalTweetText.split("\n"),function (s) {
                return "<div>" + s + "</div>";
            }).join("");

            return "RT " + screenName + ": " + originalTweetText.replace(/\s+$/g, "");
        };

        var hideRetweetDialog = function () {
            $("#retweet-tweet-dialog").find("button.modal-close").click();
        };

        var showGlobalTweetDialog = function () {
            var jRetweetDialog = $("#retweet-tweet-dialog"),
                jGlobalDialog = $("#global-tweet-dialog");
            jGlobalDialog.find(".draggable").attr("style", jRetweetDialog.find(".draggable").attr("style"));
            $("#global-new-tweet-button").click();
            jGlobalDialog.find(".modal-title").html(jRetweetDialog.find(".modal-title").text());
        };

        var prepareRT = function (tweetNode) {
            hideRetweetDialog();
            showGlobalTweetDialog();
            var text = getOriginalTweetText(tweetNode);
            fillInTweetBox(text);
        };

        var fillInTweetBox = function (text) {
            var jTweetBox = $("#global-tweet-dialog").find("div.tweet-box"),
                range = document.createRange(),
                selection = window.getSelection();

            jTweetBox.html(text);
            jTweetBox.focus();
            // Place cursor in the front.
            range.selectNodeContents(jTweetBox.get(0));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        };

        var replaceCancelButton = function () {
            var jRetweetDialog = $("#retweet-tweet-dialog");
            jRetweetDialog.find("button.cancel-action").
                addClass("rt-action").
                removeClass("cancel-action").
                text("RT").
                click(function () {
                    prepareRT(jRetweetDialog.find(".tweet"));
                });
        };

        var rtForProtected = function () {
            $(document).on("mouseup", ".retweet.cannot-retweet", function (evtMouseUp) {
                if (evtMouseUp.button == 2) { // Ignore right-clicks
                    return;
                }
                var jRTAction = $(evtMouseUp.target);
                jRTAction.on("click", function rtClick(evtClick) {
                    jRTAction.off("click", rtClick);
                    evtClick.stopPropagation();
                    evtClick.preventDefault();
                    prepareRT(jRTAction.parents(".tweet"));
                });
            });
        };
        replaceCancelButton();
        rtForProtected();
    };

    var HotKey = function () {
        var KEY_ENTER = 13,
            KEY_SHIFT = 16,
            KEY_CTRL = 17;

        var isCtrlPressed = false,
            isShiftPressed = false;

        $(document).on("keydown", function (evt) {
            if (evt.which === KEY_CTRL) {
                isCtrlPressed = true;
            }
            else if (evt.which === KEY_SHIFT) {
                isShiftPressed = true;
            }
            else if (evt.which === KEY_ENTER && (isShiftPressed || isCtrlPressed) && $(evt.target).hasClass("tweet-box")) {
                $(evt.target.parentNode.parentNode).find("button.tweet-action").click();
            }
        });

        $(document).on("keyup", function (evt) {
            if (evt.which === KEY_CTRL) {
                isCtrlPressed = false;
            }
            else if (evt.which === KEY_SHIFT) {
                isShiftPressed = false;
            }
        });

    };

    var tcoMatcher = /^http(?:s)?:\/\/t\.co\/[0-9A-Za-z]+$/i;
    var expandURL = function (node) {
        var expandedUrl = node.getAttribute("data-expanded-url");
        if (expandedUrl && tcoMatcher.test(node.getAttribute("href"))) {
            node.setAttribute("href", expandedUrl);
        }
    };

    $(document).ready(function () {
        HotKey();
        RT();
    });

    var styles = [
        "@media screen {",
        ".cannot-retweet{display: inline !important;}", // rt for protected tweet
        ".content-main, .profile-header {float: left !important;}",
        ".dashboard {float: right !important;}",
        "#suggested-users {clear: none !important;}",
        "}"
    ].join("");

    var addStyle = function (css) {
        var node = document.createElement("style");
        node.type = "text/css";
        node.appendChild(document.createTextNode(css));
        document.documentElement.appendChild(node);
        node = null;
    };

    addStyle(styles);

    new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            Array.prototype.forEach.call((mutation.addedNodes || []), function (addedNode) {
                if (addedNode.nodeType === 1) { // Element
                    Array.prototype.forEach.call(addedNode.getElementsByTagName("A"), expandURL);
                }
            });
        });
    }).observe(document, {
        childList: true,
        subtree: true
    });
})(this);