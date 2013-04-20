// ==UserScript==
// @name TwiShell
// @namespace TwiShell
// @description Enhance Twitter Web with lots of features.
// @match http://twitter.com/*
// @match https://twitter.com/*
// @version 1.0
// @run-at document-end
// @require http://code.jquery.com/jquery-2.0.0.min.js
// @grant GM_addStyle
// ==/UserScript==

if (typeof addStyle === "undefined") {
    var addStyle = function (css) {
        if (typeof GM_addStyle !== "undefined") {
            GM_addStyle(css);
        } else if (typeof PRO_addStyle !== "undefined") {
            PRO_addStyle(css);
        } else {
            var heads = document.getElementsByTagName("head");
            if (heads.length > 0) {
                var node = document.createElement("style");
                node.type = "text/css";
                node.appendChild(document.createTextNode(css));
                heads[0].appendChild(node);
                node = null;
            }
        }
    };
}

//noinspection ThisExpressionReferencesGlobalObjectJS
this.$ = this.jQuery = jQuery.noConflict(true);

//noinspection ThisExpressionReferencesGlobalObjectJS
(function (window) {
    var document = window.document,
        setTimeout = window.setTimeout,
        clearTimeout = window.clearTimeout,
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var throttle = function (fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
            deferTimer;
        return function () {
            var context = scope || this;

            var now = Date.now(),
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    };

    var RT = function () {
        var ELEMENT_NODE = 1,
            TEXT_NODE = 3;

        var jRetweetDialog = $("#retweet-tweet-dialog"),
            jGlobalDialog = $("#global-tweet-dialog");

        var getOriginalTweetText = function () {
            var originalTweetText = "",
                childNode,
                childNodes = jRetweetDialog.find("div.content p.js-tweet-text").get(0).childNodes,
                i = 0,
                text,
                screenName = jRetweetDialog.find("div.stream-item-header span.username").text().trim();

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
            return "RT " + screenName + ": " + originalTweetText.trim().replace(/\s{2,}/g, " ");
        };

        var hideRetweetDialog = function () {
            jRetweetDialog.find("button.modal-close").click();
        };

        var showGlobalTweetDialog = function () {
            jGlobalDialog.find(".draggable").attr("style", jRetweetDialog.find(".draggable").attr("style"));
            $("#global-new-tweet-button").click();
            jGlobalDialog.find(".modal-title").html(jRetweetDialog.find(".modal-title").text());
        };

        var prepareRT = function () {
            hideRetweetDialog();
            showGlobalTweetDialog();
            fillInTweetBox(getOriginalTweetText());
        };

        var isRetweetDialogShow = function () {
            // I don't know why but when no "opacity" style, its value is "1".
            return jRetweetDialog.css("display") === "block" && +jRetweetDialog.css("opacity") <= 1;
        };

        var waitForRetweetDialog = function (callback) {
            if (typeof MutationObserver !== "undefined") {
                var observer = new MutationObserver(function (mutations) {
                    for (var i = 0; i < mutations.length; i += 1) {
                        if (mutations[i].attributeName === "style" && isRetweetDialogShow()) {
                            observer.disconnect();
                            callback();
                        }
                    }
                });
                observer.observe(jRetweetDialog.get(0), { attributes: true });
            }
            else {
                jRetweetDialog.on("DOMAttrModified", function (event) {
                    if (event.attrName === "style" && isRetweetDialogShow()) {
                        jRetweetDialog.off("DOMAttrModified");
                        callback();
                    }
                });
            }
        };

        var fillInTweetBox = function (text) {
            var jTweetBox = jGlobalDialog.find("div.tweet-box"),
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
            var jCancelAction = jRetweetDialog.find("button.cancel-action");

            jCancelAction.addClass("rt-action").removeClass("cancel-action");
            jCancelAction.text("RT");

            jRetweetDialog.find("button.rt-action").click(prepareRT);
            $(document).on("mouseup", ".cannot-retweet b", function (event) {
                if (event.button == 2) { // Ignore right-clicks
                    return;
                }
                $(event.target).click(function () {
                    jRetweetDialog.css("visibility", "hidden");
                    waitForRetweetDialog(function () {
                        prepareRT();
                        jRetweetDialog.css("display", "none");
                        jRetweetDialog.css("visibility", "");
                    });
                })
            });
        };

        addStyle(".cannot-retweet{display: inline !important;}");
        replaceCancelButton();
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

    var ExpandURL = function () {
        var expandAllLinks = function () {
            var expandedUrl;
            Array.prototype.forEach.call(document.querySelectorAll("a.twitter-timeline-link:not(.link-expanded)"),
                function (node) {
                    if (/^http(?:s)?:\/\/t\.co\/[0-9A-Za-z]+$/g.test(node.href)) {
                        expandedUrl = node.getAttribute("data-expanded-url");
                        if (expandedUrl) {
                            node.href = expandedUrl;
                        }
                        node.className += " link-expanded";
                    }
                });
        };

        var throttledExpandAllLinks = throttle(expandAllLinks);
        if (typeof MutationObserver !== "undefined") {
            var observer = new MutationObserver(throttledExpandAllLinks);
            observer.observe(document, { childList: true, subtree: true });
        }
        else {
            document.addEventListener("DOMNodeInserted", throttledExpandAllLinks, false);
            document.addEventListener("DOMSubtreeModified", throttledExpandAllLinks, false);
        }
    };

    $(document).ready(function () {
        RT();
        HotKey();
        ExpandURL();
    });
})(this);