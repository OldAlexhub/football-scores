package com.oldalexhub.footballscores.widget

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WidgetBridgePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == WidgetBridgeModule::class.java.simpleName || name == "WidgetBridge") {
      WidgetBridgeModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        "WidgetBridge" to
          ReactModuleInfo(
            "WidgetBridge",
            "WidgetBridge",
            false,
            false,
            false,
            false,
            true,
          ),
      )
    }
  }
}
