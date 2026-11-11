/*
 * channelTranslations — per-language channel UI strings.
 * Every language object is stored in ./<lang>.js; the complement objects and the final
 * merge loop are byte-identical to the former channelsTranslations.js.
 */
import de from './de.js';
import en from './en.js';
import ru from './ru.js';
import es from './es.js';
import fr from './fr.js';
import fa from './fa.js';
import ja from './ja.js';
import pt from './pt.js';
import ar from './ar.js';
import zh from './zh.js';
import hi from './hi.js';
import tr from './tr.js';
import it from './it.js';
import pl from './pl.js';
import uk from './uk.js';
import ko from './ko.js';
import id from './id.js';
import sq from './sq.js';

export const channelTranslations = {
  de,
  en,
  ru,
  es,
  fr,
  fa,
  ja,
  pt,
  ar,
  zh,
  hi,
  tr,
  it,
  pl,
  uk,
  ko,
  id,
  sq,
};

const commonChannelTranslationComplements = {
  action_failed: "Action failed.",
  category_all: "All",
  category_entertainment: "Entertainment",
  category_general: "General",
  category_news: "News",
  category_sports: "Sports",
  category_tech: "Tech",
  channel_control: "Channel Control",
  channel_status_updated: "Channel status was updated.",
  channel_suspended_desc: "This channel was suspended by abuse consensus for policy violations. Reason",
  channel_suspended_title: "Channel Suspended",
  certified: "Certified",
  anonymous: "Anonymous",
  close: "Close",
  confirm_delete_desc: "Do you really want to permanently delete this channel? This cannot be undone and all posts will be deleted.",
  confirm_delete_title: "Delete channel",
  decertified: "Certification removed",
  default_owner: "Lead Moderator",
  delete_failed: "Delete failed.",
  format_bold: "Bold",
  format_italic: "Italic",
  format_underline: "Underline",
  menu: "Menu",
  overview: "Overview",
  policy_violation: "Policy violation",
  post_placeholder: "Share an encrypted update...",
  report_failed: "Report failed.",
  report_harassment: "Harassment / Threat",
  report_illegal_content: "Illegal content",
  report_malware: "Malware / Technical attacks",
  report_other: "Other",
  report_phishing: "Fraud / Phishing",
  report_sent_desc: "The channel has been reported to the moderators.",
  report_sent_title: "Report sent",
  report_spam: "Spam / Abuse",
  report_threat: "Immediate threat / danger",
  save_failed: "Channel could not be saved.",
  severity_critical: "Critical",
  severity_high: "High",
  severity_low: "Low",
  severity_medium: "Medium"
};

const channelTranslationComplements = {
  de: {
    action_failed: "Aktion fehlgeschlagen.",
    category_all: "Alle",
    category_entertainment: "Unterhaltung",
    category_general: "Allgemein",
    category_news: "Nachrichten",
    category_sports: "Sport",
    category_tech: "Technik",
    channel_control: "Kanalsteuerung",
    channel_status_updated: "Kanalstatus wurde aktualisiert.",
    channel_suspended_desc: "Dieser Kanal wurde durch den Abuse-Consensus wegen Richtlinienverstößen gesperrt. Begründung",
    channel_suspended_title: "Kanal gesperrt",
    certified: "Zertifiziert",
    anonymous: "Anonym",
    close: "Schließen",
    confirm_delete_desc: "Möchtest du diesen Kanal wirklich dauerhaft löschen? Dies kann nicht rückgängig gemacht werden und alle Beiträge werden gelöscht.",
    confirm_delete_title: "Kanal löschen",
    decertified: "Zertifizierung entzogen",
    default_owner: "Haupt-Moderator",
    delete_failed: "Löschen fehlgeschlagen.",
    format_bold: "Fett",
    format_italic: "Kursiv",
    format_underline: "Unterstrichen",
    menu: "Menü",
    policy_violation: "Richtlinienverletzung",
    post_placeholder: "Teile ein verschlüsseltes Update...",
    report_failed: "Meldung fehlgeschlagen.",
    report_harassment: "Belästigung / Bedrohung",
    report_illegal_content: "Illegale Inhalte",
    report_malware: "Malware / technische Angriffe",
    report_other: "Sonstiges",
    report_phishing: "Betrug / Phishing",
    report_sent_desc: "Der Kanal wurde den Moderatoren gemeldet.",
    report_sent_title: "Report gesendet",
    report_spam: "Spam / Abuse",
    report_threat: "Akute Bedrohung / Gefahr",
    save_failed: "Kanal konnte nicht gespeichert werden.",
    severity_critical: "Kritisch",
    severity_high: "Hoch",
    severity_low: "Niedrig",
    severity_medium: "Mittel",
    no_posts: "Keine Beiträge gefunden.",
    pinned: "Fixiert",
    pin: "Fixieren",
    unpin: "Lösen",
    comments: "Kommentare"
  },
  en: { no_posts: "No posts found.", pinned: "Pinned", pin: "Pin", unpin: "Unpin", comments: "Comments" },
  ru: { no_posts: "Публикации не найдены.", pinned: "Закреплено", pin: "Закрепить", unpin: "Открепить", comments: "Комментарии" },
  es: { no_posts: "No se encontraron publicaciones.", pinned: "Fijado", pin: "Fijar", unpin: "Desfijar", comments: "Comentarios" },
  fr: { no_posts: "Aucune publication trouvée.", pinned: "Épinglé", pin: "Épingler", unpin: "Désépingler", comments: "Commentaires" },
  fa: { no_posts: "هیچ پستی پیدا نشد.", pinned: "سنجاق‌شده", pin: "سنجاق کردن", unpin: "برداشتن سنجاق", comments: "دیدگاه‌ها" },
  ja: { no_posts: "投稿が見つかりません。", pinned: "固定済み", pin: "固定", unpin: "固定解除", comments: "コメント" },
  pt: { no_posts: "Nenhuma publicação encontrada.", pinned: "Fixado", pin: "Fixar", unpin: "Desafixar", comments: "Comentários" },
  ar: { no_posts: "لم يتم العثور على منشورات.", pinned: "مثبت", pin: "تثبيت", unpin: "إلغاء التثبيت", comments: "التعليقات" },
  zh: { no_posts: "未找到帖子。", pinned: "已置顶", pin: "置顶", unpin: "取消置顶", comments: "评论" },
  hi: { no_posts: "कोई पोस्ट नहीं मिली।", pinned: "पिन किया गया", pin: "पिन करें", unpin: "अनपिन करें", comments: "टिप्पणियाँ" },
  tr: { no_posts: "Gönderi bulunamadı.", pinned: "Sabitlendi", pin: "Sabitle", unpin: "Sabitlemeyi kaldır", comments: "Yorumlar" },
  it: { no_posts: "Nessun post trovato.", pinned: "Fissato", pin: "Fissa", unpin: "Rimuovi fissaggio", comments: "Commenti" },
  pl: { no_posts: "Nie znaleziono postów.", pinned: "Przypięte", pin: "Przypnij", unpin: "Odepnij", comments: "Komentarze" },
  uk: { no_posts: "Публікацій не знайдено.", pinned: "Закріплено", pin: "Закріпити", unpin: "Відкріпити", comments: "Коментарі" },
  ko: { no_posts: "게시물을 찾을 수 없습니다.", pinned: "고정됨", pin: "고정", unpin: "고정 해제", comments: "댓글" },
  id: { no_posts: "Tidak ada postingan ditemukan.", pinned: "Disematkan", pin: "Sematkan", unpin: "Lepas sematan", comments: "Komentar" },
  sq: { no_posts: "Nuk u gjet asnjë postim.", pinned: "I fiksuar", pin: "Fikso", unpin: "Hiq fiksimin", comments: "Komentet" }
};

Object.entries(channelTranslationComplements).forEach(([language, entries]) => {
  channelTranslations[language] = {
    ...commonChannelTranslationComplements,
    ...(channelTranslations[language] || {}),
    ...entries
  };
});
