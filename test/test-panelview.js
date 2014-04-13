/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { PanelView } = require("./panelview");
var { ActionButton } = require ("sdk/ui/button/action");
const { getMostRecentBrowserWindow } = require('sdk/window/utils');
const { Cu } = require('chrome');
const { CustomizableUI } = Cu.import('resource:///modules/CustomizableUI.jsm', {});
const { getNodeView } = require("sdk/view/core");

//yes, I feel dirty for doing this.
var buttonTest = "waiting";

function createPanelView(testId) {
    return PanelView({
        id: testId,
        title: 'testView',
        content: [
            {
                label: 'an action',
                type: 'button',
                onClick: function() {
                    buttonTest = "successful";
                }
                //TODO test icon
            },
            {
                type: 'separator'
            },
            {
                label: 'a checkbox',
                type: 'button',
                actionType: 'checkbox',
                onClick: function() {
                    //nothing
                }
            }
        ],
        footer: {
            label: 'footer',
            onClick: function() {
                buttonTest = "footer";
            }
        }
    });
}

function createActionButton(buttonId) {
    return ActionButton({
        id: buttonId,
        label: "Test button",
        icon: module.uri.replace(/[^\.\\\/]*\.js$/, "test-icon.png")
    });
}

exports.testConstruction = function(assert) {
    let testId = "test-panelview-construction";

    let pv = createPanelView(testId, buttonTest);
    
    let document = getMostRecentBrowserWindow().document;
    assert.ok(document.getElementById(testId),"Panel has not been added to the window");
    assert.equal(testId, pv.id, "Id has not been set correctly");
    let subview = document.getElementById(pv.id);
    
    assert.ok(subview.getElementsByClassName("panel-subview-header")[0], "Panelview header has not been created");
    assert.equal(subview.getElementsByClassName("panel-subview-header")[0].getAttribute("value"), "testView", "Subview title isn't set properly");

    assert.ok(subview.getElementsByClassName("panel-subview-body")[0], "Panelview main content has not been created");
    let content = subview.getElementsByClassName("panel-subview-body")[0];
    assert.ok(content.getElementsByClassName("subviewbutton")[0], "Panelview main content does not have an action inside");
    assert.equal(content.getElementsByClassName("subviewbutton")[0].getAttribute("label"), "an action", "Panelview main content first action does not have the correct label");

    assert.ok(content.getElementsByTagName("toolbarseparator")[0], "Toolbar separator not created");

    assert.ok(content.getElementsByClassName("subviewbutton")[1], "Second button not created properly");
    assert.equal(content.getElementsByClassName("subviewbutton")[1].getAttribute("type"), "checkbox");

    assert.ok(subview.getElementsByClassName("panel-subview-footer")[0], "Subview footer not created properly");
    assert.equal(subview.getElementsByClassName("panel-subview-footer")[0].getAttribute("label"), 'footer');
    subview.getElementsByClassName("panel-subview-footer")[0].doCommand();
    assert.equal(buttonTest, "footer", "Footer command is not executed properly");
    assert.ok(!pv.isShowing(), "Panel not closed after command on footer button");

    pv.destroy();

    var pva, pvb;
    try {
        pva = PanelView({
            id:'test-panelview-content-a',
            title:'Another Panelview',
            content: [
                {
                    label: "invalid content item"
                }
            ]
        });
    }
    catch(e) {
        assert.pass("Creating a view with an invalid content item throws an error");
    }

    try {
        pvb = PanelView({
            id:'test-panelview-content-b',
            title:'Yet Another Panelview',
            content: [
                {
                    label: "content item with unsupported type",
                    type: "menu"
                }
            ]
        });
    }
    catch(e) {
        assert.pass("Creating a view with a content item with an unsuported type throws an error");
    }
};

exports.testButtons = function(assert) {
    let pv = createPanelView("test-panelview-buttons"),
        button = createActionButton("test-panelview-buttons-button"),
        document = getMostRecentBrowserWindow().document,
        content = document.getElementById(pv.id).getElementsByClassName("panel-subview-body")[0];

    pv.show(button);
    assert.ok(pv.isShowing());
    content.getElementsByClassName("subviewbutton")[0].doCommand();
    assert.equal(buttonTest, "successful", "Action click handler not working properly");
    assert.ok(!pv.isShowing(), "Panel not closed after command on regular content button");

    pv.show(button);
    assert.ok(pv.isShowing());
    buttonTest = "click test";
    content.getElementsByClassName("subviewbutton")[1].doCommand();
    assert.equal(buttonTest, "click test", "Command triggers command functions of other buttons");
    assert.ok(pv.isShowing(), "Panel closed after command on checkbox item");

    pv.destroy();
    button.destroy();
};

exports.testDestroy = function(assert) {
    let document = getMostRecentBrowserWindow().document;
    assert.ok(!document.getElementById("test-panelview-destroy"), "There already is an element with the desired ID");
    let pv = createPanelView("test-panelview-destroy");
    assert.ok(document.getElementById(pv.id), "Panelview wasn't created properly");
    pv.destroy();
    // can't use pv.id, as viewFor will not return anything if it has been destroyed properly.
    assert.ok(!document.getElementById("test-panelview-destroy"), "Panelview wasn't removed properly");
};

exports.testShow = function(assert, done) {
    let pv = createPanelView("test-panelview-show");
    assert.ok(!pv.isShowing(), "Panelview is already displaying even though never prompted to open");
    assert.throws(pv.show,/A subview can only be displayed with a button as anchor/,"Show didn't throw even though it didn't get the required arguments");
    assert.ok(!pv.isShowing(), "Panelview is opened even though no anchor was passed");

    assert.throws(function() {
        pv.show({});
    } ,/A subview can only be displayed with a button as anchor/, "Show didn't throw even though it didn't get the required arguments");

    let button = createActionButton("test-panelview-show-button")
    pv.show(button);
    assert.ok(pv.isShowing(), "Panelview did not open");

    pv.hide();
    assert.ok(!pv.isShowing());

    let window = getMostRecentBrowserWindow();
    button.on("click", function() {
        pv.show(button);
    });
    button.click();
    assert.ok(pv.isShowing(), "Panelview did not open after simualting a click on the button");

    pv.hide();
    assert.ok(!pv.isShowing());
    // move button to menu panel
    CustomizableUI.addWidgetToArea(getNodeView(button).id, CustomizableUI.AREA_PANEL);
    assert.equal(CustomizableUI.getPlacementOfWidget(getNodeView(button).id).area, CustomizableUI.AREA_PANEL, "Button was not moved into the menu panel");
    require("panelview/workaround").applyButtonFix(button);
    let window = getMostRecentBrowserWindow();
    window.PanelUI.show();
    pv.show(button);
    assert.ok(pv.isShowing(), "Panelview did not open in the menu panel");
    
    pv.hide(); // this destroys the menu panel
    assert.ok(!pv.isShowing());
    button.click(); // and this doesn't work either way.
    assert.ok(pv.isShowing(), "Panelview wasn't opened properly in the menu panel by simulating a click on the button (currently expected)");

    //button.destroy();
    //pv.destroy();
};

exports.testHide = function(assert) {
    let pv = createPanelView("test-panelview-hide"),
        button = createActionButton("test-panelview-hide-button");
    pv.show(button);
    assert.ok(pv.isShowing(), "Panelview hasn't been opened to run this test properly");
    pv.hide();
    assert.ok(!pv.isShowing(), "Panelview hasn't been closed by hide");
    
    button.destroy();
    pv.destroy();
};

exports.testShowEvent = function(assert, done) {
    let pv = createPanelView("test-panelview-showevent"),
        button = createActionButton("test-panelview-showevent-button");

    pv.on("show", function(event) {
        assert.pass("Panelview was successfully opened");

        button.destroy();
        pv.destroy();

        done();
    });
    pv.show(button);
};

exports.testHideEvent = function(assert, done) {
    let pv = createPanelView("test-panelview-hideevent"),
        button = createActionButton("test-panelview-hideevent-button");

    pv.on("hide", function(event) {
        assert.pass("Panelview was successfully closed");

        button.destroy();
        pv.destroy();

        done();
    });
    pv.show(button);
    pv.hide();
};

require('sdk/test').run(exports);

