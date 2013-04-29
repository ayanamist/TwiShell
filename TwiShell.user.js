// ==UserScript==
// @name TwiShell
// @namespace TwiShell
// @description Enhance Twitter Web with lots of features.
// @match http://twitter.com/*
// @match https://twitter.com/*
// @version 1.0
// @run-at document-start
// @require http://code.jquery.com/jquery-2.0.0.min.js
// ==/UserScript==

//noinspection ThisExpressionReferencesGlobalObjectJS
(function (window) {
    var $ = window.jQuery.noConflict(true),
        document = window.document;

    var addStyle = function (css) {
        var node = document.createElement("style");
        node.type = "text/css";
        node.appendChild(document.createTextNode(css));
        document.documentElement.appendChild(node);
        node = null;
    };

    var addScript = function (scriptText) {
        var node = document.createElement("script");
        node.type = "text/javascript";
        node.innerHTML = scriptText;
        document.getElementsByTagName("head")[0].appendChild(node);
        node = null;
    };

    var Utils = {
        isInit: false,
        _remoteQueue: [],
        init: function () {
            var delegate = function delegate() {
                if (typeof window.$ === "undefined") {
                    setTimeout(delegate, 100);
                    return;
                }
                document.addEventListener("remote$Listener", function (remoteEvt) {
                    var type = remoteEvt.detail.type,
                        selector = remoteEvt.detail.selector;
                    $(selector).on(type, function (localEvt) {
                        var callbackEvt = new CustomEvent("remote$" + type, {
                            detail: {event: localEvt}
                        });
                        document.dispatchEvent(callbackEvt);
                    });
                }, false);
                var okEvt = new CustomEvent("remote$OK");
                document.dispatchEvent(okEvt);
            };
            document.addEventListener("remote$OK", function okCallback(){
                document.removeEventListener("remote$OK", okCallback, false);
                Utils.isInit = true;
                Utils.finishJob();
            }, false);
            addScript("(" + delegate.toString() + ")()");

        },
        finishJob: function () {
            var remoteCall = function (selector, type, callback) {
                document.addEventListener("remote$" + type, function (callbackEvt) {
                    callback(callbackEvt.detail.event);
                }, false);
                var remoteEvt = new CustomEvent("remote$Listener", {
                    detail: {type: type, selector: selector}
                });
                document.dispatchEvent(remoteEvt);
            };
            var job;
            if (Utils.isInit) {
                while (Utils._remoteQueue.length) {
                    job = Utils._remoteQueue.pop();
                    remoteCall.apply(null, job);
                }
            }
        },
        addRemoteEventListener: function (selector, type, callback) {
            Utils._remoteQueue.push([selector, type, callback]);
            Utils.finishJob();
        }
    };

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
            addStyle(".cannot-retweet{display: inline !important;}");
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

    var ExpandURL = function () {
        var tcoMatcher = /^http(?:s)?:\/\/t\.co\/[0-9A-Za-z]+$/i,
            nodeHref,
            expandedUrl;

        var expandAllUrls = function (tweetNode) {
            Array.prototype.map.call(tweetNode.querySelectorAll("a.twitter-timeline-link"), function (aNode) {
                nodeHref = aNode.getAttribute("href");
                if (tcoMatcher.test(nodeHref)) {
                    expandedUrl = aNode.getAttribute("data-expanded-url");
                    expandedUrl && aNode.setAttribute("href", expandedUrl);
                }
            });
        };
        Utils.addRemoteEventListener("#timeline", "uiHasInjectedTimelineItem", function (evt) {
            expandAllUrls(evt.target);
        });
        expandAllUrls(document);
    };

    $(document).ready(function () {
        Utils.init();
        HotKey();
        RT();
        ExpandURL();
    });
})(this);