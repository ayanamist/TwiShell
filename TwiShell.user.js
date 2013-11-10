// ==UserScript==
// @name TwiShell
// @namespace TwiShell
// @description Enhance Twitter Web with lots of features.
// @match http://twitter.com/*
// @match https://twitter.com/*
// @version 2.0
// @run-at document-start
// ==/UserScript==

//noinspection ThisExpressionReferencesGlobalObjectJS
(function (window) {
    'use strict';
    var document = window.document;

    var ELEMENT_NODE = 1,
        TEXT_NODE = 3;

    var click = function (node) {
        var event = document.createEvent("Event");
        event.initEvent("click", true, true);
        node.dispatchEvent(event);
    };

    var hasClass = function (node, cls) {
        return node.classList.contains(cls);
    };

    var addClass = function (node, cls) {
        node.classList.add(cls);
    };

    var removeClass = function (node, cls) {
        node.classList.remove(cls);
    };

    var globalDialog,
        retweetDialog;

    var getOriginalTweetText = function (tweetNode) {
        var originalTweetText = Array.prototype.reduce.call(
            tweetNode.querySelector("div.content p.js-tweet-text").childNodes,
            function (acc, childNode) {
                var text;
                if (childNode.nodeType === TEXT_NODE) {
                    text = childNode.textContent;
                }
                else if (childNode.nodeType === ELEMENT_NODE) {
                    text = childNode.getAttribute("data-expanded-url") || childNode.textContent;
                }
                if (text) {
                    acc.push(text);
                }
                return acc;
            },
            []
        ).join("");
        var screenName = tweetNode.querySelector("div.stream-item-header span.username").textContent.trim();
        return "RT " + screenName + ": " + originalTweetText.split("\n").map(function (s) {
            return "<div>" + s + "</div>";
        }).join("");
    };

    var hideRetweetDialog = function () {
        click(document.querySelector("#retweet-tweet-dialog button.modal-close"));
    };

    var showGlobalTweetDialog = function () {
        globalDialog.querySelector(".draggable").setAttribute(
            "style",
            retweetDialog.querySelector(".draggable").getAttribute("style")
        );
        click(document.getElementById("global-new-tweet-button"));
        globalDialog.querySelector(".modal-title").innerHTML =
            retweetDialog.querySelector(".modal-title").innerHTML;
    };

    var prepareRT = function (tweetNode) {
        hideRetweetDialog();
        showGlobalTweetDialog();
        var text = getOriginalTweetText(tweetNode);
        fillInTweetBox(text);
    };

    var fillInTweetBox = function (text) {
        var tweetBox = globalDialog.querySelector("div.tweet-box"),
            range = document.createRange(),
            selection = window.getSelection();

        tweetBox.innerHTML = text;
        tweetBox.focus();
        // Place cursor in the front.
        range.selectNodeContents(tweetBox);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    var replaceCancelButton = function () {
        var btnCancel = retweetDialog.querySelector("button.cancel-action");
        addClass(btnCancel, "rt-action");
        removeClass(btnCancel, "cancel-action");
        btnCancel.innerHTML = "RT";
        btnCancel.addEventListener("click", function () {
            prepareRT(retweetDialog.querySelector(".tweet"));
        }, false);
    };

    var HotKey = function () {
        var KEY_ENTER = 13,
            KEY_SHIFT = 16,
            KEY_CTRL = 17;

        var isCtrlPressed = false,
            isShiftPressed = false;

        document.addEventListener("keydown", function (evt) {
            if (evt.which === KEY_CTRL) {
                isCtrlPressed = true;
            }
            else if (evt.which === KEY_SHIFT) {
                isShiftPressed = true;
            }
            else if (evt.which === KEY_ENTER && (isShiftPressed || isCtrlPressed) &&
                hasClass(evt.target, "tweet-box")) {
                click(evt.target.parentNode.parentNode.querySelector("button.tweet-action"));
            }
        }, false);

        document.addEventListener("keyup", function (evt) {
            if (evt.which === KEY_CTRL) {
                isCtrlPressed = false;
            }
            else if (evt.which === KEY_SHIFT) {
                isShiftPressed = false;
            }
        }, false);

    };

    var tcoMatcher = /^http(?:s)?:\/\/t\.co\/[0-9A-Za-z]+$/i;
    var expandURL = function (node) {
        var expandedUrl = node.getAttribute("data-expanded-url");
        if (expandedUrl && tcoMatcher.test(node.getAttribute("href"))) {
            node.setAttribute("href", expandedUrl);
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        globalDialog = document.getElementById("global-tweet-dialog");
        retweetDialog = document.getElementById("retweet-tweet-dialog");
        HotKey();
        replaceCancelButton();
    }, false);

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
                if (addedNode.nodeType === ELEMENT_NODE) {
                    Array.prototype.forEach.call(addedNode.getElementsByTagName("A"), expandURL);
                    Array.prototype.forEach.call(addedNode.querySelectorAll(".retweet.cannot-retweet"), function (node) {
                        node.addEventListener("click", function (evt) {
                            if (evt.button == 2) { // Ignore right-clicks
                                return;
                            }
                            evt.stopPropagation();
                            evt.preventDefault();
                            var target = evt.target;
                            while (target && !(hasClass(target, "tweet"))) {
                                target = target.parentNode;
                            }
                            if (target) {
                                prepareRT(target);
                            }
                        }, false);
                    });
                }
            });
        });
    }).observe(document, {
        childList: true,
        subtree: true
    });
})(this);