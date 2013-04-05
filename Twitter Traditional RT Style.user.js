// ==UserScript==
// @name Twitter Traditional RT Style
// @namespace Twitter-Traditional-RT-Style
// @description Add traditional RT to official Twitter Web.
// @include http://twitter.com/*
// @include https://twitter.com/*
// @match http://twitter.com/*
// @match https://twitter.com/*
// @grant unsafeWindow
// @run-at document-end
// @version 1.7
// ==/UserScript==
(function (document) {
    var ELEMENT_NODE = 1,
        TEXT_NODE = 3;

    var camelize = function (str) {
        return str.replace(/-+(.)?/g, function (match, chr) {
            return chr ? chr.toUpperCase() : ''
        })
    };

    var dasherize = function (str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase()
    };

    var jOn = function (node, eventName, selector, listener) {
        node.addEventListener(eventName, function (event) {
            var matched = true,
                target = event.target,
                callback;

            var matchesSelector = target.webkitMatchesSelector || target.mozMatchesSelector ||
                target.oMatchesSelector || target.matchesSelector;

            if (typeof listener !== "undefined") {
                matched = matchesSelector.call(target, selector);
                callback = listener;
            }
            else {
                callback = selector;
            }
            if (matched) {
                callback(event);
            }
        }, false);
    };

    var jCss = function (node, property, value) {
        if (typeof value === "undefined") {
            return (node.style[camelize(property)] || getComputedStyle(node, '').getPropertyValue(property));
        }
        var css = "";
        if (!value && value !== 0)
            node.style.removeProperty(dasherize(property));
        else
            css = dasherize(property) + ":" + value;

        return node.style.cssText += ';' + css;
    };

    if (typeof addStyle != "undefined") {
        var addStyle = function (css) {
            if (typeof GM_addStyle != "undefined") {
                GM_addStyle(css);
            } else if (typeof PRO_addStyle != "undefined") {
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

    var onReady = function () {
        addStyle(".tweet .cannot-retweet{display: inline !important;}");

        var retweetDialog = document.getElementById("retweet-tweet-dialog"),
            globalDialog = document.getElementById("global-tweet-dialog");

        var getOriginalTweetText = function () {
            var originalTweetText,
                tweetTextElementText,
                tweetTextElements,
                screenName = retweetDialog.querySelector("div.content div.stream-item-header span.username").
                    textContent.trim();

            tweetTextElements = retweetDialog.querySelector("div.content p.js-tweet-text").childNodes;
            originalTweetText = "";
            Array.prototype.forEach.call(tweetTextElements, function (tweetTextElement) {
                tweetTextElementText = "";
                if (tweetTextElement.nodeType === TEXT_NODE) {
                    tweetTextElementText = tweetTextElement.textContent;
                }
                else if (tweetTextElement.nodeType === ELEMENT_NODE) {
                    tweetTextElementText = Array.prototype.join.call(
                        Array.prototype.map.call(
                            tweetTextElement.querySelectorAll(":not(.tco-ellipsis)"), function (el) {
                                return el.textContent
                            }), "");
                    if (!tweetTextElementText) {
                        tweetTextElementText = tweetTextElement.textContent;
                    }
                }
                if (tweetTextElementText) {
                    originalTweetText += tweetTextElementText;
                }
            });
            return "RT " + screenName + ": " + originalTweetText.trim().replace(/\s{2,}/g, " ");
        };

        var invokeClick = function (el) {
            var evt = document.createEvent("Event");

            evt.initEvent('click', true, true);
            el.dispatchEvent(evt);
        };

        var hideRetweetDialog = function () {
            invokeClick(document.querySelector("#retweet-tweet-dialog button.modal-close"));
        };

        var showGlobalTweetDialog = function () {
            globalDialog.querySelector(".draggable").setAttribute("style", retweetDialog.querySelector(".draggable").getAttribute("style"));
            invokeClick(document.querySelector("button#global-new-tweet-button"));
            globalDialog.querySelector(".modal-title").innerHTML = retweetDialog.querySelector(".modal-title").textContent;
        };

        var whenOnRetweetDialog = function () {
            hideRetweetDialog();
            showGlobalTweetDialog();
            fillInTweetBox(getOriginalTweetText());
        };

        var waitForRetweetDialog = function () {
            if ((retweetDialog.offsetWidth === 0 && retweetDialog.offsetHeight === 0 ) ||
                (((retweetDialog.style && retweetDialog.style.display) || jCss(retweetDialog, "display")) === "none")) {
                setTimeout(waitForRetweetDialog, 100);
            }
            else {
                whenOnRetweetDialog();
                jCss(retweetDialog, "display", "none");
                jCss(retweetDialog, "visibility", "");
            }
        };

        var fillInTweetBox = function (text) {
            var editableDiv = globalDialog.querySelector("div.tweet-box"),
                range = document.createRange(),
                selection = window.getSelection();

            editableDiv.innerHTML = text;
            editableDiv.focus();
            range.selectNodeContents(editableDiv);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        };

        var btnAction = retweetDialog.querySelector("button.cancel-action");

        btnAction.className = btnAction.className.replace(/\bcancel-action\b/g, "rt-action");
        btnAction.innerHTML = "RT";
        jOn(retweetDialog, "click", ".original-tweet", function (event) {
            if (event.target.tagName === "DIV") {
                whenOnRetweetDialog();
            }
        });
        jOn(retweetDialog, "click", "button.rt-action", whenOnRetweetDialog);
        jOn(document, "mouseup", ".tweet .cannot-retweet span.retweet", function (event) {
            if (event.button == 2) { // Ignore right-clicks
                return;
            }
            jOn(event.target, "click", function () {
                jCss(retweetDialog, "visibility", "hidden");
                waitForRetweetDialog();
            })
        });
    };

    if (/complete|loaded|interactive/.test(document.readyState)) {
        onReady();
    }
    else {
        document.addEventListener("DOMContentLoaded", onReady, false);
    }
})(document);