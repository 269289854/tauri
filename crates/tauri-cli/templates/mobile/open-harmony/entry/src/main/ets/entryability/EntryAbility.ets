import { RustAbility } from '@ohos-rs/ability'
import Want from '@ohos.app.ability.Want'
import { AbilityConstant } from '@kit.AbilityKit';
import window from '@ohos.window';

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
   * 返回键处理：任一 WebView 可后退则执行 WebView 后退并消费事件，
   * 而不是退出应用；无历史时走系统默认。controller 由
   * DefaultXComponent 注册到 AppStorage（本 SDK 无
   * getAllWebControllers/findControllerByName 静态 API）。
   */
  onBackPressed(): boolean {
    try {
      const controller = AppStorage.get<ESObject>(
        "ohos.rs.ability.webviewController",
      ) as unknown as { backwardIfPossible?: () => boolean } | undefined;
      if (controller && typeof controller.backwardIfPossible === "function") {
        return controller.backwardIfPossible();
      }
    } catch (e) {
      console.error('[EntryAbility] back handling failed:', e);
    }
    return false;
  }
}
