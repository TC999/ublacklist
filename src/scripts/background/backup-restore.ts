import dayjs from "dayjs";
import {
  defaultLocalStorageItems,
  loadFromLocalStorage,
} from "../local-storage.ts";
import { updateAllRemote as updateAllRemoteSerpInfo } from "../serpinfo/background.ts";
import * as SerpInfoSettings from "../serpinfo/settings.ts";
import type {
  LocalStorageItemsBackupRestore,
  Subscriptions,
} from "../types.ts";
import { toPlainRuleset } from "../utilities.ts";
import { resetAllInRawStorage } from "./raw-storage.ts";
import { updateAll as updateAllSubscriptions } from "./subscriptions.ts";

export async function backup(): Promise<LocalStorageItemsBackupRestore> {
  const items = await loadFromLocalStorage([
    "blacklist",
    "blockWholeSite",
    "skipBlockDialog",
    "hideBlockLinks",
    "hideControl",
    "enablePathDepth",
    "enableMatchingRules",
    "linkColor",
    "blockColor",
    "highlightColors",
    "dialogTheme",
    "syncBlocklist",
    "syncGeneral",
    "syncAppearance",
    "syncSubscriptions",
    "syncSerpInfo",
    "syncInterval",
    "subscriptions",
    "updateInterval",
    "serpInfoSettings",
  ]);
  return {
    ...items,
    subscriptions: Object.values(items.subscriptions).map((s) => ({
      name: s.name,
      url: s.url,
      enabled: s.enabled ?? true,
    })),
    serpInfoSettings: SerpInfoSettings.toSerializable(items.serpInfoSettings),
  };
}

export async function restore(
  items: Readonly<Partial<LocalStorageItemsBackupRestore>>,
): Promise<void> {
  await resetAllInRawStorage(({ nextSubscriptionId }) => {
    const defaults = defaultLocalStorageItems;
    const now = dayjs().toISOString();

    const blacklist = items.blacklist ?? defaults.blacklist;
    const ruleset = toPlainRuleset(blacklist);

    const subscriptions: Subscriptions = {};
    for (const { name, url, enabled } of items.subscriptions ||
      Object.values(defaults.subscriptions)) {
      subscriptions[nextSubscriptionId] = {
        name,
        url,
        ruleset: toPlainRuleset(""),
        blacklist: "",
        updateResult: false,
        enabled: enabled ?? true,
      };
      ++nextSubscriptionId;
    }

    return {
      ruleset,
      blacklist,
      timestamp: now,

      blockWholeSite: items.blockWholeSite ?? defaults.blockWholeSite,
      skipBlockDialog: items.skipBlockDialog ?? defaults.skipBlockDialog,
      hideBlockLinks: items.hideBlockLinks ?? defaults.hideBlockLinks,
      hideControl: items.hideControl ?? defaults.hideControl,
      enablePathDepth: items.enablePathDepth ?? defaults.enablePathDepth,
      enableMatchingRules:
        items.enableMatchingRules ?? defaults.enableMatchingRules,
      generalLastModified: now,

      linkColor: items.linkColor ?? defaults.linkColor,
      blockColor: items.blockColor ?? defaults.blockColor,
      highlightColors: items.highlightColors ?? defaults.highlightColors,
      dialogTheme: items.dialogTheme ?? defaults.dialogTheme,
      appearanceLastModified: now,

      // Disable sync.
      syncCloudId: false,
      syncCloudToken: false,
      syncResult: false,
      syncBlocklist: items.syncBlocklist ?? defaults.syncBlocklist,
      syncGeneral: items.syncGeneral ?? defaults.syncGeneral,
      syncAppearance: items.syncAppearance ?? defaults.syncAppearance,
      syncSerpInfo: items.syncSerpInfo ?? defaults.syncSerpInfo,
      syncSubscriptions: items.syncSubscriptions ?? defaults.syncSubscriptions,
      syncInterval: items.syncInterval ?? defaults.syncInterval,

      subscriptions,
      nextSubscriptionId,
      updateInterval: items.updateInterval ?? defaults.updateInterval,
      subscriptionsLastModified: now,

      serpInfoSettings: items.serpInfoSettings
        ? {
            ...SerpInfoSettings.fromSerializable(items.serpInfoSettings),
            lastModified: now,
          }
        : defaults.serpInfoSettings,
    };
  });

  void updateAllSubscriptions();
  void updateAllRemoteSerpInfo();
}

export async function reset(): Promise<void> {
  await resetAllInRawStorage(() => ({}));
}
