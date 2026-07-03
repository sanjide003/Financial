const dictionaries = {
  en: {
    noTransactionsToExport: 'No transactions to export.',
    csvDownloaded: 'CSV export downloaded.',
    backupDownloaded: 'Backup downloaded.',
    backupImportDone: 'Backup import completed.',
    backupImportEmpty: 'Backup file has no supported records.',
    pdfReady: 'Print dialog opened. Choose Save as PDF.',
    popupBlocked: 'Popup blocked. Please allow popups to export PDF.'
  },
  ml: {
    noTransactionsToExport: 'Export ചെയ്യാൻ transactions ഇല്ല.',
    csvDownloaded: 'CSV export download ചെയ്തു.',
    backupDownloaded: 'Backup download ചെയ്തു.',
    backupImportDone: 'Backup import പൂർത്തിയായി.',
    backupImportEmpty: 'Backup file-ൽ supported records ഇല്ല.',
    pdfReady: 'Print dialog തുറന്നു. Save as PDF തിരഞ്ഞെടുക്കുക.',
    popupBlocked: 'Popup blocked. PDF export ചെയ്യാൻ popups allow ചെയ്യുക.'
  },
  ar: {
    noTransactionsToExport: 'لا توجد معاملات للتصدير.',
    csvDownloaded: 'تم تنزيل ملف CSV.',
    backupDownloaded: 'تم تنزيل النسخة الاحتياطية.',
    backupImportDone: 'اكتمل استيراد النسخة الاحتياطية.',
    backupImportEmpty: 'لا يحتوي ملف النسخة الاحتياطية على سجلات مدعومة.',
    pdfReady: 'تم فتح نافذة الطباعة. اختر حفظ كملف PDF.',
    popupBlocked: 'تم حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة لتصدير PDF.'
  }
};

let currentLanguage = localStorage.getItem('fintrack_language') || 'ml';

const setLanguage = (language) => {
  currentLanguage = dictionaries[language] ? language : 'ml';
  localStorage.setItem('fintrack_language', currentLanguage);
};

const t = (key) => dictionaries[currentLanguage]?.[key] || dictionaries.en[key] || key;

window.i18n = { t, setLanguage, getLanguage: () => currentLanguage };

export { t, setLanguage };
