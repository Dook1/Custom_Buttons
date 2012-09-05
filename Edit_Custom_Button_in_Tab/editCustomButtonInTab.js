﻿// http://infocatcher.ucoz.net/js/cb/editCustomButtonInTab.js

// Edit Custom Button in Tab button for Custom Buttons
// (code for "initialization" section)

// (c) Infocatcher 2012
// version 0.1.5 - 2012-08-10

// Note:
// In Firefox 3.6 and older:
// - "Save size and position of editor windows separately for each custom button" option should be enabled
// - tab with editor can't be closed sometimes using OK/Cancel buttons
// And in new Firefox/SeaMonkey versins reload command closes tab.

var editInTabLabel = (function() {
	var locale = (cbu.getPrefs("general.useragent.locale") || "en").match(/^\w*/)[0];
	if(locale == "ru")
		return "Редактировать во вкладке…";
	return "Edit button in tab…";
})();

const editId = "custombuttons-contextpopup-edit";
const editInTabId = editId + "-inTab";
const cbIdAttr = "custombuttons-editInTab-id";
const editorBaseUri = "chrome://custombuttons/content/editor.xul";
var editInTab = document.getElementById(editInTabId);
if(editInTab)
	editInTab.parentNode.removeChild(editInTab);
var editItem = document.getElementById(editId);
editInTab = editItem.cloneNode(true);
editInTab.id = editInTabId;
editInTab.setAttribute("label", editInTabLabel);
editInTab.setAttribute("oncommand", "editCustomButtonInTab();");
editInTab.removeAttribute("observes"); // For Firefox 3.6 and older
editItem.parentNode.insertBefore(editInTab, editItem.nextSibling);

window.editCustomButtonInTab = function(btn, newTab) { // Should be global to work in cloned menus
	if(!btn)
		btn = custombuttons.popupNode;
	if(!btn)
		return;
	var link = custombuttons.makeButtonLink("edit", btn.id);
	var cbService = Components.classes["@xsms.nm.ru/custombuttons/cbservice;1"]
		.getService(Components.interfaces.cbICustomButtonsService);
	var param = cbService.getButtonParameters(link);
	var editorUri = editorBaseUri;
	if(cbService.mode & 64)
		editorUri += "?window=" + cbService.getWindowId(document.documentURI) + "&id=" + btn.id;

	// Search for already opened tab
	var rawParam = unwrap(param);
	var ws = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator)
		.getEnumerator("navigator:browser");
	while(ws.hasMoreElements()) {
		let gBrowser = ws.getNext().gBrowser;
		let tabs = gBrowser.tabs || gBrowser.tabContainer.childNodes;
		for(let i = 0, l = tabs.length; i < l; ++i) {
			let tab = tabs[i];
			let browser = tab.linkedBrowser;
			if(!browser)
				continue;
			let win = browser.contentWindow;
			if(win.location != editorUri)
				continue;
			win = unwrap(win);
			let winParam = "arguments" in win && win.arguments.length
				? unwrap(win.arguments[0])
				: win.editor.param;
			if(winParam.buttonLink == link) {
				gBrowser.selectedTab = tab;
				newTab && setTimeout(function() {
					gBrowser.removeTab(newTab);
				}, 0);
				return;
			}
		}
	}

	// Or open new tab
	var tab = newTab;
	if(!tab) {
		tab = gBrowser.selectedTab = gBrowser.addTab(editorUri);
		initSessionStore();
		tab.setAttribute(cbIdAttr, btn.id);
	}

	var browser = tab.linkedBrowser;
	browser.addEventListener("DOMContentLoaded", function load(e) {
		var doc = e.target;
		if(doc.location != editorUri)
			return;
		browser.removeEventListener(e.type, load, false);

		var win = doc.defaultView;
		win.arguments = [param];

		var iconLink = doc.createElementNS("http://www.w3.org/1999/xhtml", "link");
		iconLink.rel = "shortcut icon";
		//iconLink.href = "chrome://custombuttons-context/content/icons/default/custombuttonsEditor.ico";
		iconLink.href = getStdImage(rawParam.image);
		iconLink.style.display = "none";
		doc.documentElement.insertBefore(iconLink, doc.documentElement.firstChild);

		var alreadyAsked = false;
		function checkUnsaved(e) {
			if(alreadyAsked)
				return;
			if(!unwrap(doc).documentElement.cancelDialog())
				e.preventDefault();
		}
		function onDialogCancel(e) {
			alreadyAsked = true;
			// win.setTimeout shouldn't fire while confirmation dialog from the same window are opened
			win.setTimeout(function() {
				alreadyAsked = false;
			}, 100);
		}
		function destroy(e) {
			win.removeEventListener("dialogcancel", onDialogCancel, false);
			win.removeEventListener("beforeunload", checkUnsaved, false);
			win.removeEventListener("unload", destroy, false);
		}
		win.addEventListener("dialogcancel", onDialogCancel, false);
		win.addEventListener("beforeunload", checkUnsaved, false);
		win.addEventListener("unload", destroy, false);
	}, false);
};
function unwrap(o) {
	return o.wrappedJSObject || o; // Firefox 3.6 and older
}
function getStdImage(iid) {
	if(/^custombuttons-stdicon-(\d)$/.test(iid)) switch(+RegExp.$1) {
		// chrome://custombuttons/skin/custombuttons.css
		// toolbarbutton[cb-stdicon="custombuttons-stdicon-*"] { ... }
		case 1: return "chrome://custombuttons/skin/button.png";
		case 2: return "chrome://custombuttons/skin/stdicons/rbutton.png";
		case 3: return "chrome://custombuttons/skin/stdicons/gbutton.png";
		case 4: return "chrome://custombuttons/skin/stdicons/bbutton.png";
	}
	return iid || "chrome://custombuttons/skin/button.png";
}

function initSessionStore() {
	initSessionStore = function() {};
	var ss = (
		Components.classes["@mozilla.org/browser/sessionstore;1"]
		|| Components.classes["@mozilla.org/suite/sessionstore;1"]
	).getService(Components.interfaces.nsISessionStore);
	ss.persistTabAttribute(cbIdAttr);
}
function checkTab(tab) {
	var cbId = tab.getAttribute(cbIdAttr);
	if(!cbId)
		return;
	initSessionStore();
	let btn = document.getElementById(cbId);
	if(btn)
		editCustomButtonInTab(btn, tab);
}
// We can't use only SSTabRestoring: user can reload tab with editor
addEventListener("DOMContentLoaded", function(e) {
	var doc = e.target;
	if(doc.location.href.substr(0, editorBaseUri.length) != editorBaseUri)
		return;
	var tabs = gBrowser.tabs || gBrowser.tabContainer.childNodes;
	for(var i = 0, l = tabs.length; i < l; ++i) {
		let tab = tabs[i];
		let browser = tab.linkedBrowser;
		if(browser && browser.contentDocument == doc) {
			checkTab(tab);
			break;
		}
	}
}, true, gBrowser);
checkTab(gBrowser.selectedTab);

this.onDestroy = function(reason) {
	if(reason == "update" || reason == "delete") {
		let editInTab = document.getElementById(editInTabId);
		if(editInTab)
			editInTab.parentNode.removeChild(editInTab);
		delete window.editCustomButtonInTab;
	}
};