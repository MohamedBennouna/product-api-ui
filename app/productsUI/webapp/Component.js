sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("productsUI.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Create the device model
      const oDeviceModel = new JSONModel({
        isPhone: sap.ui.Device.system.phone,
        isTablet: sap.ui.Device.system.tablet,
        isDesktop: sap.ui.Device.system.desktop
      });
      this.setModel(oDeviceModel, "device");

      console.log("Products Component initialized successfully");
    },

    createContent: function() {
      return sap.ui.view({
        viewName: "productsUI.view.Products",
        type: sap.ui.core.mvc.ViewType.XML
      });
    }
  });
});

