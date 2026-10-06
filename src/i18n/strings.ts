export const en = {
  "app.name": "Dakhil",
  "app.title": "Dakhil: Our Tender Document Package Builder",
  "app.tagline": "Tender package builder",
  "app.skip": "Skip to content",
  "app.privacy": "Your files stay in this browser. Nothing is uploaded.",
  "lang.label": "Language",
  "theme.toDark": "Switch to dark mode",
  "theme.toLight": "Switch to light mode",
  "nav.label": "Main",
  "nav.home": "Home",
  "nav.tender": "Your tender",
  "nav.sample": "Sample tender",
  "start.resume": "Continue where you left off",
  "sample.loading": "Opening the sample tender…",
  "sample.retry": "Try again",
  "sample.home": "Back to home",
  "sample.note":
    "This is the contest sample pack. Some of its files have problems on purpose. Match each file to its document and see what the checklist catches.",
  "sample.quick": "Quick select",
  "bar.begin":
    "Choose a file for each required document. Anything that needs fixing will be listed here.",

  "start.title": "Build a tender package you can trust.",
  "start.lead":
    "Open the requirements file that came with the tender. You will see every document it asks for, and each one is checked as you add your PDFs.",
  "start.step1": "Open requirements.json",
  "start.step2": "Add your PDF files and match them",
  "start.step3": "Download one checked, ordered package",
  "start.drop": "Drop requirements.json here",
  "start.dropHint":
    "You can also drop the whole tender folder, PDF files included.",
  "start.choose": "Choose requirements.json",
  "start.sample": "Try with the sample tender",
  "start.loading": "Opening…",
  "start.err.json":
    "This file could not be read. Please choose the requirements.json file from the tender pack.",
  "start.err.shape":
    "This file is not a valid tender requirements list. Please check it and try again.",
  "start.err.none":
    "No requirements.json was found. Open that file first, then add your PDFs.",
  "start.err.sample":
    "The sample tender could not be loaded. Please check your connection.",

  "tender.id": "Tender ID",
  "tender.entity": "Procuring entity",
  "tender.bidder": "Bidder",
  "tender.deadline": "Submission deadline",
  "tender.startOver": "Start over",
  "tender.confirm": "Remove this tender and all files?",
  "tender.confirmYes": "Yes, start over",
  "tender.cancel": "Cancel",

  "ledger.title": "Required documents",
  "ledger.hint": "In the order they will appear in the package.",
  "row.optional": "Optional",
  "row.fileFor": "File for {doc}",
  "row.noFile": "Choose a file…",
  "row.clear": "No file",
  "row.inUse": "used for {doc}",
  "row.sameContentUsed": "same content already used",
  "row.unmatch": "Remove file from {doc}",
  "row.expiry": "Expiry date",
  "row.page": "p. {a}",
  "row.pages": "pp. {a}–{b}",
  "row.hint.expiryNeeded": "Enter the expiry date printed on this document.",
  "row.hint.expired":
    "This expires before the submission deadline ({date}). Use a renewed copy.",
  "row.hint.optional":
    "This document is optional, so you can also remove the file.",

  "status.missing": "Missing",
  "status.expiryNeeded": "Expiry date needed",
  "status.expired": "Expired",
  "status.notProvided": "Not provided",
  "status.ok": "OK",

  "tray.title": "Your files",
  "tray.drop": "Drop PDF files here",
  "tray.choose": "Add PDF files",
  "tray.empty": "No files yet. Add all the PDFs for this tender at once.",
  "tray.reading": "Reading…",
  "tray.limits": "PDF only · up to 30 files · 50 MB in total",
  "file.pages.one": "1 page",
  "file.pages.many": "{n} pages",
  "file.useFor": "Use this file for",
  "file.notUsed": "Not used",
  "file.choose": "Use for…",
  "file.remove": "Remove {file}",
  "file.duplicate": "Same content as {file}",
  "file.drag": "Drag onto a document, or choose below.",

  "reject.notPdf": "{file} is not a PDF. Only PDF files can be added.",
  "reject.damaged": "{file} is damaged and could not be opened.",
  "reject.locked":
    "{file} is password-protected or locked. Save an unlocked copy and add it again.",
  "reject.unreadable": "{file} could not be read. Please add it again.",
  "reject.tooMany": "{file} was not added. You can add up to 30 files.",
  "reject.tooLarge":
    "{file} was not added. All files together must be under 50 MB.",
  "notice.duplicate":
    "{file} has the same content as {other}, which is already used for {doc}. The same file cannot be used for two documents.",
  "common.dismiss": "Dismiss",

  "bar.progress": "{done} of {total} required documents ready",
  "bar.fix": "Still to fix:",
  "bar.clear": "Everything is in order. The package will have {pages} pages.",
  "bar.generate": "Generate package",
  "bar.building": "Building page {page} of {total}…",
  "bar.done": "Package ready · {pages} pages",
  "bar.doneOne": "Package ready · 1 page",
  "bar.clearOne": "Everything is in order. The package will have 1 page.",
  "bar.download": "Download",
  "bar.preview": "Open preview",
  "bar.error":
    "The package could not be built because {file} could not be read. Remove it and add a fresh copy.",
  "bar.errorGeneric": "The package could not be built. Please try again.",
  "bar.more": "+{n} more",
  "bar.optionalOnly": "No documents are required for this tender.",

  "start.replace":
    "Opening {id} will replace your current tender ({current}) and its files.",
  "start.replaceYes": "Replace it",
  "error.title": "Something went wrong.",
  "error.body":
    "Your files never left this browser. Reload the page to start again.",
  "error.reload": "Reload the page",
} as const

export type StringKey = keyof typeof en

export const bn: Record<StringKey, string> = {
  "app.name": "দাখিল",
  "app.title": "দাখিল: আমাদের টেন্ডার প্যাকেজ টুল",
  "app.tagline": "টেন্ডার প্যাকেজ অ্যাপ",
  "app.skip": "স্কিপ টু মেইন",
  "app.privacy":
    "আপনার ফাইল ব্রাউজারেই থাকে। কোন ফাইল কোথাও কোন সার্ভারে আপলোড হয় না।",
  "lang.label": "ভাষা",
  "theme.toDark": "ডার্ক মোড চালু করুন",
  "theme.toLight": "লাইট মোড চালু করুন",
  "nav.label": "মেইন মেনু",
  "nav.home": "হোম",
  "nav.tender": "আপনার টেন্ডার",
  "nav.sample": "ডেমো টেন্ডার",
  "start.resume": "যেখানে ছিলেন সেখান থেকে চালিয়ে যান",
  "sample.loading": "ডেমো টেন্ডার খোলা হচ্ছে…",
  "sample.retry": "আবার চেষ্টা করুন",
  "sample.home": "হোমে ফিরুন",
  "sample.note":
    "এআই ডেভফেস্ট ভাইবকোডিং কম্পিটিশানের জন্য এই অ্যাপ। ডেমো টেন্ডার এর ডেটার কয়েকটি ফাইলে ইচ্ছে করেই সমস্যা রাখা আছে। প্রতিটি ফাইল তার কাগজের সাথে মিলিয়ে দেখুন তো, তালিকায় কী ধরা পড়ে?!",
  "sample.quick": "কুইক সিলেক্ট",
  "bar.begin":
    "প্রতিটি ম্যান্ডেটরি কাগজের জন্য একটি ফাইল সিলেক্ট করুন। কিছু ঠিক করার থাকলে এখানে দেখা যাবে।",

  "start.title": "টেন্ডার প্যাকেজ বানিয়ে নিন নিমেষেই!",
  "start.lead":
    "টেন্ডারের সাথে পাওয়া requirements ফাইলটি খুলুন। পরবর্তী ধাপে কোন কোন কাগজ লাগবে তার দিক নির্দেশনা দেওয়া আছে, আর আপনি PDF যোগ করলেই প্রতিটি একে একে যাচাই করা হবে।",
  "start.step1": "requirements.json খুলুন",
  "start.step2": "PDF ফাইল যোগ করে মিলিয়ে দিন",
  "start.step3": "যাচাই করা, সাজানো একটি প্যাকেজ ডাউনলোড করুন",
  "start.drop": "requirements.json এখানে ছেড়ে দিন",
  "start.dropHint":
    "চাইলে PDF ফাইলসহ পুরো টেন্ডার ফোল্ডারটিই ছেড়ে দিতে পারেন।",
  "start.choose": "requirements.json বাছুন",
  "start.sample": "নমুনা টেন্ডার দিয়ে দেখুন",
  "start.loading": "খোলা হচ্ছে…",
  "start.err.json":
    "ফাইলটি পড়া যায়নি। টেন্ডার প্যাকের requirements.json ফাইলটি বাছুন।",
  "start.err.shape":
    "এই ফাইলে টেন্ডারের কাগজপত্রের সঠিক তালিকা নেই। ফাইলটি দেখে আবার চেষ্টা করুন।",
  "start.err.none":
    "requirements.json পাওয়া যায়নি। আগে সেই ফাইলটি খুলুন, তারপর PDF যোগ করুন।",
  "start.err.sample": "নমুনা টেন্ডার খোলা যায়নি। ইন্টারনেট সংযোগ দেখুন।",

  "tender.id": "টেন্ডার আইডি",
  "tender.entity": "ক্রয়কারী প্রতিষ্ঠান",
  "tender.bidder": "দরদাতা",
  "tender.deadline": "দাখিলের শেষ তারিখ",
  "tender.startOver": "নতুন করে শুরু",
  "tender.confirm": "এই টেন্ডার ও সব ফাইল সরিয়ে ফেলবেন?",
  "tender.confirmYes": "হ্যাঁ, নতুন করে শুরু",
  "tender.cancel": "বাতিল",

  "ledger.title": "প্রয়োজনীয় কাগজপত্র",
  "ledger.hint": "প্যাকেজে যে ক্রমে থাকবে সেই ক্রমে।",
  "row.optional": "ঐচ্ছিক",
  "row.fileFor": "{doc}-এর ফাইল",
  "row.noFile": "ফাইল বাছুন…",
  "row.clear": "কোনো ফাইল নয়",
  "row.inUse": "{doc}-এ ব্যবহৃত",
  "row.sameContentUsed": "একই ফাইল আগেই ব্যবহৃত",
  "row.unmatch": "{doc} থেকে ফাইল সরান",
  "row.expiry": "মেয়াদ শেষের তারিখ",
  "row.page": "পৃ. {a}",
  "row.pages": "পৃ. {a}–{b}",
  "row.hint.expiryNeeded": "কাগজে লেখা মেয়াদ শেষের তারিখটি দিন।",
  "row.hint.expired":
    "দাখিলের শেষ তারিখের ({date}) আগেই এর মেয়াদ শেষ। নবায়ন করা কপি দিন।",
  "row.hint.optional": "এই কাগজটি ঐচ্ছিক, তাই চাইলে ফাইলটি সরিয়েও দিতে পারেন।",

  "status.missing": "নেই",
  "status.expiryNeeded": "মেয়াদের তারিখ দিন",
  "status.expired": "মেয়াদোত্তীর্ণ",
  "status.notProvided": "দেওয়া হয়নি",
  "status.ok": "ঠিক আছে",

  "tray.title": "আপনার ফাইল",
  "tray.drop": "PDF ফাইল এখানে ছেড়ে দিন",
  "tray.choose": "PDF ফাইল যোগ করুন",
  "tray.empty": "এখনও কোনো ফাইল নেই। এই টেন্ডারের সব PDF একসাথে যোগ করুন।",
  "tray.reading": "পড়া হচ্ছে…",
  "tray.limits": "শুধু PDF · সর্বোচ্চ 30টি ফাইল · মোট 50 MB",
  "file.pages.one": "1 পৃষ্ঠা",
  "file.pages.many": "{n} পৃষ্ঠা",
  "file.useFor": "এই ফাইলটি যে কাগজের জন্য",
  "file.notUsed": "ব্যবহার হচ্ছে না",
  "file.choose": "যে কাগজের জন্য…",
  "file.remove": "{file} সরান",
  "file.duplicate": "{file}-এর হুবহু নকল",
  "file.drag": "কাগজের সারিতে টেনে আনুন, অথবা নিচ থেকে বাছুন।",

  "reject.notPdf": "{file} PDF নয়। শুধু PDF ফাইল যোগ করা যায়।",
  "reject.damaged": "{file} নষ্ট, খোলা যায়নি।",
  "reject.locked":
    "{file} পাসওয়ার্ড দিয়ে সুরক্ষিত বা লক করা। লক ছাড়া একটি কপি সেভ করে আবার যোগ করুন।",
  "reject.unreadable": "{file} পড়া যায়নি। আবার যোগ করুন।",
  "reject.tooMany": "{file} যোগ হয়নি। সর্বোচ্চ 30টি ফাইল যোগ করা যায়।",
  "reject.tooLarge": "{file} যোগ হয়নি। সব ফাইল মিলিয়ে 50 MB-এর কম হতে হবে।",
  "notice.duplicate":
    "{file} আর {other} হুবহু একই ফাইল, এবং সেটি আগেই {doc}-এ ব্যবহৃত। একই ফাইল দুটি কাগজে ব্যবহার করা যায় না।",
  "common.dismiss": "বন্ধ করুন",

  "bar.progress": "{total}টি আবশ্যিক কাগজের মধ্যে {done}টি প্রস্তুত",
  "bar.fix": "এখনও ঠিক করতে হবে:",
  "bar.clear": "সব ঠিক আছে। প্যাকেজে {pages} পৃষ্ঠা থাকবে।",
  "bar.generate": "প্যাকেজ তৈরি করুন",
  "bar.building": "{total} পৃষ্ঠার মধ্যে {page} নম্বর তৈরি হচ্ছে…",
  "bar.done": "প্যাকেজ প্রস্তুত · {pages} পৃষ্ঠা",
  "bar.doneOne": "প্যাকেজ প্রস্তুত · 1 পৃষ্ঠা",
  "bar.clearOne": "সব ঠিক আছে। প্যাকেজে 1 পৃষ্ঠা থাকবে।",
  "bar.download": "ডাউনলোড",
  "bar.preview": "প্রিভিউ খুলুন",
  "bar.error":
    "{file} পড়া যায়নি, তাই প্যাকেজ তৈরি হয়নি। ফাইলটি সরিয়ে নতুন কপি যোগ করুন।",
  "bar.errorGeneric": "প্যাকেজ তৈরি করা যায়নি। আবার চেষ্টা করুন।",
  "bar.more": "আরও {n}টি",
  "bar.optionalOnly": "এই টেন্ডারে কোনো কাগজ আবশ্যিক নয়।",

  "start.replace":
    "{id} খুললে আপনার বর্তমান টেন্ডার ({current}) ও তার ফাইলগুলো সরে যাবে।",
  "start.replaceYes": "বদলে ফেলুন",
  "error.title": "কিছু একটা সমস্যা হয়েছে।",
  "error.body":
    "আপনার ফাইল এই ব্রাউজারের বাইরে কোথাও যায়নি। নতুন করে শুরু করতে পেজটি আবার লোড করুন।",
  "error.reload": "পেজ আবার লোড করুন",
}
