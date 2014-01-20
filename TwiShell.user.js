// ==UserScript==
// @name TwiShell
// @namespace TwiShell
// @description Enhance Twitter Web with lots of features.
// @match http://twitter.com/*
// @match https://twitter.com/*
// @version 3.3
// @grant none
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
        return node.classList && node.classList.contains(cls);
    };

    var addClass = function (node, cls) {
        node.classList.add(cls);
    };

    var removeClass = function (node, cls) {
        node.classList.remove(cls);
    };

    var toggleClass = function (node, cls) {
        node.classList.toggle(cls);
    };

    var wantsMoreTimelineItems = function () {
        var event = document.createEvent("Event");
        event.initEvent("uiNearTheBottom", true, true);
        document.dispatchEvent(event);
    };

    // throttle function call in specified interval
    var throttle = function (fn, interval) {
        var fnTimer;
        var repeatCalling = false;
        return function wrapper() {
            if (!fnTimer) {
                fn();
                fnTimer = setTimeout(function () {
                    fnTimer = null;
                    if (repeatCalling) {
                        repeatCalling = false;
                        wrapper();
                    }
                }, interval);
            }
            else {
                repeatCalling = true;
            }
        };
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

    var isAttachedMap = Object.create(null);
    var attachProtectedTweet = function () {
        Array.prototype.forEach.call(document.querySelectorAll(".tweet[data-protected=true]"), function (protectedTweet) {
            var itemId = protectedTweet.getAttribute("data-item-id");
            if (!(isAttachedMap[itemId])) {
                isAttachedMap[itemId] = true;
                protectedTweet.querySelector(".retweet.cannot-retweet").addEventListener("click", function (evt) {
                    if (evt.button == 2) { // Ignore right-clicks
                        return;
                    }
                    evt.stopPropagation();
                    evt.preventDefault();
                    for (var tweet = evt.target.parentNode; !(hasClass(tweet, "tweet")); tweet = tweet.parentNode) {}
                    prepareRT(tweet);
                }, false);
            }
        });
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
    var expandAllUrl = function () {
        Array.prototype.forEach.call(
            document.querySelectorAll("a.twitter-timeline-link:not(.url-expanded)"),
            function (tlLink) {
                var expandedUrl = tlLink.getAttribute("data-expanded-url");
                if (expandedUrl && tcoMatcher.test(tlLink.getAttribute("href"))) {
                    tlLink.setAttribute("href", expandedUrl);
                }
                addClass(tlLink, "url-expanded");
            }
        );
    };

    var publicBtnHtml = "<a class=\"btn user-tl-public-btn inline-content-header-btn js-user-tl-public\">Public</a>";
    var addPublicBtn = function () {
        var timeline = document.getElementById("timeline");
        if (!timeline) {
            return;
        }
        var publicBtn = timeline.querySelector(".js-user-tl-public");
        if (publicBtn) {
            return;
        }
        var div = document.createElement("div");
        div.innerHTML = publicBtnHtml;
        publicBtn = div.childNodes[0];

        var pathname = document.location.pathname.toLowerCase();
        if (/\/lists$/.test(pathname) ||
            pathname.indexOf("/following") >= 0 ||
            pathname.indexOf("/followers") >= 0 ||
            pathname.indexOf("/members") >= 0 ||
            pathname.indexOf("/subscribers") >= 0 ||
            pathname.indexOf("/memberships") >= 0 ||
            pathname.indexOf("/settings") >= 0) {
            addClass(timeline, "not-timeline");
        }
        else {
            removeClass(timeline, "not-timeline");
        }

        var headerInner = timeline.querySelector(".header-inner");
        var searchHeader = headerInner.querySelector(".search-header");
        if (searchHeader) {
            searchHeader.insertBefore(publicBtn, searchHeader.querySelector(".search-title"));
        }
        else {
            headerInner.appendChild(publicBtn);
        }
        var streamContainer = document.getElementById("stream-items-id");
        publicBtn.addEventListener("click", function () {
            toggleClass(publicBtn, "active");
            toggleClass(streamContainer, "public-stream-items");
            willWantsMoreItems();
        });
    };

    var willWantsMoreItems = function () {
        var streamContainer = document.getElementById("stream-items-id");
        if (!streamContainer || !(hasClass(streamContainer, "public-stream-items"))) {
            return;
        }
        var streamItems = streamContainer.childNodes;
        var streamItemsLength = streamItems.length;
        var last20Items = Array.prototype.slice.call(streamItems, Math.max(0, streamItemsLength - 20));
        // if the last 20 items are all not public, infinite scroll of twitter will be broken
        // so we should invoke loading manually to fix the problem
        if (last20Items.every(function (item) {
            return hasClass(item, "not-public-stream-item");
        }) || streamContainer.querySelectorAll(".stream-item:not(.not-public-stream-item)").length < 20) {
            wantsMoreTimelineItems();
        }
    };

    var isPublicMap = Object.create(null);
    var addNotPublicClass = function () {
        Array.prototype.forEach.call(document.querySelectorAll(".original-tweet"), function (originalTweet) {
            var itemId = originalTweet.getAttribute("data-item-id");
            if (!(isPublicMap[itemId])) {
                isPublicMap[itemId] = true;
                if (originalTweet.getAttribute("data-is-reply-to") === "true" ||
                    originalTweet.querySelector(".tweet-text").textContent.trim()[0] === "@") {
                    addClass(originalTweet.parentNode, "not-public-stream-item");
                }
            }
        });
        willWantsMoreItems();
    };

    window.addEventListener("popstate", addPublicBtn, false);

    document.addEventListener("DOMContentLoaded", function () {
        globalDialog = document.getElementById("global-tweet-dialog");
        retweetDialog = document.getElementById("retweet-tweet-dialog");
        HotKey();
        replaceCancelButton();
        addPublicBtn();
    }, false);

    var styles = [
        "@media screen {",
        ".cannot-retweet{display: inline !important;}", // rt for protected tweet
        ".content-main, .profile-page-header {float: left !important;}",
        ".dashboard {float: right !important;}",
        "#suggested-users {clear: none !important;}",
        ".inline-content-header-btn {float: right; margin-top: -24px;}",
        ".search-header .search-title {width: 386px;}",
        ".search-header .inline-content-header-btn {padding: 5px 10px; margin: -5px 4px 0 0;}",
        ".public-stream-items .not-public-stream-item {display: none;}",
        ".not-timeline .user-tl-public-btn {display: none;}",
        "li.stream-item .has-cards .js-media-container {max-height: 100%; transition-property: all; transition-duration: 0.2s;}",
        "li.stream-item:not(.open) .has-cards .js-media-container {max-height: 0; overflow-y: hidden; padding: 0; margin: 0; border: 0;}",
        "li.stream-item:not(.open) .has-cards .stream-item-footer {display: none;}",
        "li.stream-item:not(.open) .has-cards .expanded-content {display: none;}",
        "li.stream-item:not(.open) .has-cards .bottom-tweet-actions {margin-top: 0;}",
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

    var throttledExpandUrl = throttle(expandAllUrl, 100);
    var throttledAttachProtectedTweet = throttle(attachProtectedTweet, 100);
    var throttledAddPublicBtn = throttle(addPublicBtn, 100);
    var throttledAddNotPublicClass = throttle(addNotPublicClass, 100);
    new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes) {
                throttledExpandUrl();
                throttledAttachProtectedTweet();
                throttledAddPublicBtn();
                throttledAddNotPublicClass();
            }
        });
    }).observe(document, {
        childList: true,
        subtree: true
    });
})(this);
