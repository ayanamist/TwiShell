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
// @version 1.6
// ==/UserScript==
if (typeof unsafeWindow === "undefined" || unsafeWindow === window) {
    var div = document.createElement("div");
    div.setAttribute("onclick", "return window;");
    unsafeWindow = div.onclick();
    div = null;
}
(function (document, unsafeWindow) {
    var ELEMENT_NODE = 1,
        TEXT_NODE = 3;
    var initjQuery = function() {
        if (typeof unsafeWindow.jQuery === "undefined") {
            setTimeout(initjQuery, 100);
        }
        else {
            onReady(unsafeWindow.jQuery);
        }
    }

    var onReady = function($) {
        var jDocument = $(document),
            jRetweetDialog = $("#retweet-tweet-dialog"),
            jGlobalDialog = $("#global-tweet-dialog");

        var getOriginalTweetText = function() {
            var originalTweetText,
                tweetTextElement,
                tweetTextElementText,
                jTweetTextElement,
                tweetTextElements,
                tweetTextElementsLength,
                i;
            tweetTextElements = jRetweetDialog.find("div.content p.js-tweet-text").contents();
            tweetTextElementsLength = tweetTextElements.length;
            originalTweetText = "";
            for (i = 0; i < tweetTextElementsLength; i += 1) {
                tweetTextElement = tweetTextElements[i];
                tweetTextElementText = "";
                if (tweetTextElement.nodeType === TEXT_NODE) {
                    tweetTextElementText = tweetTextElement.textContent;
                }
                else if (tweetTextElement.nodeType === ELEMENT_NODE) {
                    jTweetTextElement = $(tweetTextElement);
                    tweetTextElementText = jTweetTextElement.find(":not(.tco-ellipsis)").text();
                    if (!tweetTextElementText) {
                        tweetTextElementText = jTweetTextElement.text();
                    }
                }
                originalTweetText += tweetTextElementText;
            }
            return "RT " + jRetweetDialog.find("div.content div.stream-item-header span.username").
                text().trim() + ": " + originalTweetText.trim().replace(/\s{2,}/g, " ");
        }

        var clickElement = function(el) {
            var evt = document.createEvent("Event");
            evt.initEvent('click', true, true);
            el.dispatchEvent(evt);
        }

        var hideRetweetDialog = function() {
            clickElement(document.querySelector("#retweet-tweet-dialog button.modal-close"));
        }

        var showGlobalTweetDialog = function() {
            jGlobalDialog.find(".draggable").attr("style", jRetweetDialog.find(".draggable").attr("style"));
            clickElement(document.querySelector("button#global-new-tweet-button"));
            jGlobalDialog.find(".modal-title").html(jRetweetDialog.find(".modal-title").text());
        }

        var whenOnRetweetDialog = function() {
            hideRetweetDialog();
            showGlobalTweetDialog();
            fillInTweetBox(getOriginalTweetText());
        }

        var waitForRetweetDialog = function() {
            if (jRetweetDialog.filter(":visible").length) {
                whenOnRetweetDialog();
                jRetweetDialog.css("display", "none");
                jRetweetDialog.css("visibility", "");
            }
            else {
                setTimeout(waitForRetweetDialog, 100);
            }
        }

        var fillInTweetBox = function(text) {
            var editableDiv = jGlobalDialog.find("div.tweet-box")[0],
                range = document.createRange(),
                selection = window.getSelection();
            editableDiv.innerHTML = text;
            editableDiv.focus();
            range.selectNodeContents(editableDiv);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        jRetweetDialog.find("button.cancel-action").addClass("rt-action").removeClass("cancel-action").html("RT");
        jDocument.on("click", "#retweet-tweet-dialog .original-tweet", function (event) {
            if (event.target.tagName.toLowerCase() === "div") {
                whenOnRetweetDialog();
            }
        });
        jDocument.on("click", "#retweet-tweet-dialog button.rt-action", whenOnRetweetDialog);
        jDocument.on("mouseup", ".tweet .cannot-retweet span.retweet", function (event) {
            if (event.button == 2) { // Ignore right-clicks
                return;
            }
            $(event.target).on("click", function () {
                jRetweetDialog.css("visibility", "hidden");
                waitForRetweetDialog();
            })
        });
    }

    var addCSS = function(css) {
        if (typeof GM_addStyle != "undefined") {
            GM_addStyle(css);
        } else if (typeof PRO_addStyle != "undefined") {
            PRO_addStyle(css);
        } else if (typeof addStyle != "undefined") {
            addStyle(css);
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
    }

    addCSS(".tweet .cannot-retweet{display: inline !important;}");
    initjQuery();
})(document, unsafeWindow);