import { RustAbility } from '@ohos-rs/ability'
import Want from '@ohos.app.ability.Want'
import { AbilityConstant } from '@kit.AbilityKit';
import window from '@ohos.window';
import web_webview from '@ohos.web.webview';

export default class EntryAbility extends RustAbility {
  // change to dynamic library name
  public moduleName: string = "{{app.lib-name}}"
  public defaultPage: boolean = true;
  public mode: 'xcomponent' | 'webview' = 'webview'

  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    super.onCreate(want, launchParam);
  }

  async onWindowStageCreate(windowStage: window.WindowStage): Promise<void> {
    const window = windowStage.getMainWindowSync();
    await window.setWindowLayoutFullScreen(false);
    super.onWindowStageCreate(windowStage);
  }

  /**
   * 返回键处理：若任一 WebView 可以后退则先执行 WebView 后退，
   * 而不是直接退出应用。与 Android Tauri AppPlugin 的
   * OnBackPressedCallback（canGoBack → goBack）行为一致。
   */
  onBackPressed(): boolean {
    try {
      const controllers: web_webview.WebviewController[] =
        web_webview.WebviewController.getAllWebControllers();
      for (const controller of controllers) {
        if (controller.accessBackward()) {
          controller.backward();
          return true;
        }
      }
    } catch (e) {
      console.error('[EntryAbility] back handling failed:', e);
    }
    return false;
  }
}
