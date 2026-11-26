export const LANGS: Record<string, { name: string; dir?: "rtl" }> = {
  en: { name: "English" },
  es: { name: "Español" },
  fr: { name: "Français" },
  de: { name: "Deutsch" },
  hi: { name: "हिन्दी" },
  ar: { name: "العربية", dir: "rtl" },
};

const en = {
  welcome: "Welcome to",
  table: "Table",
  picks: "Chef’s picks",
  soldOut: "Unavailable",
  customise: "Customise",
  add: "Add to bag",
  addedToBag: "Added to bag",
  bag: "Your bag",
  empty: "Your bag is empty",
  emptySub: "Pick something delicious from the menu.",
  size: "Size",
  required: "Required",
  optional: "Optional",
  chooseUpTo: "Choose up to",
  instructions: "Special instructions",
  instructionsPh: "Allergies, preferences…",
  orderNotes: "Notes for the kitchen",
  coupon: "Coupon code",
  apply: "Apply",
  subtotal: "Subtotal",
  discount: "Discount",
  total: "Total",
  payment: "Payment",
  cash: "Cash",
  card_at_table: "Card at the table",
  online: "Pay online",
  placeOrder: "Place order",
  placing: "Placing order…",
  needTable: "Enter your table number",
  assist: "Call waiter",
  needWaiter: "Call a waiter",
  needBill: "Ask for the bill",
  needWater: "Water please",
  assistSent: "A team member is on the way",
  view3d: "3D",
  photo: "Photo",
  ar: "AR",
  ingredients: "Ingredients",
  lite: "Lite mode",
  paused: "Ordering is paused right now",
  suspended: "This menu is temporarily unavailable.",
  language: "Language",
  quantity: "Quantity",
  remove: "Remove",
  tapToSkip: "Tap to enter",
};
export type Dict = typeof en;
const es: Partial<Dict> = {
  welcome: "Bienvenido a", table: "Mesa", picks: "Selección del chef", soldOut: "No disponible", customise: "Personalizar", add: "Añadir a la bolsa", addedToBag: "Añadido", bag: "Tu bolsa", empty: "Tu bolsa está vacía", emptySub: "Elige algo delicioso del menú.", size: "Tamaño", required: "Obligatorio", optional: "Opcional", chooseUpTo: "Elige hasta", instructions: "Instrucciones especiales", instructionsPh: "Alergias, preferencias…", orderNotes: "Notas para la cocina", coupon: "Código de cupón", apply: "Aplicar", subtotal: "Subtotal", discount: "Descuento", total: "Total", payment: "Pago", cash: "Efectivo", card_at_table: "Tarjeta en la mesa", online: "Pagar en línea", placeOrder: "Hacer pedido", placing: "Enviando…", needTable: "Introduce tu número de mesa", assist: "Llamar camarero", needWaiter: "Llamar a un camarero", needBill: "Pedir la cuenta", needWater: "Agua, por favor", assistSent: "Un miembro del equipo va en camino", ingredients: "Ingredientes", lite: "Modo ligero", language: "Idioma", quantity: "Cantidad", remove: "Quitar", tapToSkip: "Toca para entrar", paused: "Los pedidos están en pausa", suspended: "Este menú no está disponible.",
};
const fr: Partial<Dict> = {
  welcome: "Bienvenue chez", table: "Table", picks: "Sélection du chef", soldOut: "Indisponible", customise: "Personnaliser", add: "Ajouter au panier", addedToBag: "Ajouté", bag: "Votre panier", empty: "Votre panier est vide", emptySub: "Choisissez un plat délicieux.", size: "Taille", required: "Obligatoire", optional: "Facultatif", chooseUpTo: "Jusqu’à", instructions: "Instructions spéciales", instructionsPh: "Allergies, préférences…", orderNotes: "Notes pour la cuisine", coupon: "Code promo", apply: "Appliquer", subtotal: "Sous-total", discount: "Remise", total: "Total", payment: "Paiement", cash: "Espèces", card_at_table: "Carte à table", online: "Payer en ligne", placeOrder: "Commander", placing: "Envoi…", needTable: "Entrez votre numéro de table", assist: "Appeler le serveur", needWaiter: "Appeler un serveur", needBill: "Demander l’addition", needWater: "De l’eau svp", assistSent: "Un membre de l’équipe arrive", ingredients: "Ingrédients", lite: "Mode léger", language: "Langue", quantity: "Quantité", remove: "Retirer", tapToSkip: "Touchez pour entrer",
};
const de: Partial<Dict> = {
  welcome: "Willkommen bei", table: "Tisch", picks: "Empfehlungen", soldOut: "Nicht verfügbar", customise: "Anpassen", add: "In den Warenkorb", addedToBag: "Hinzugefügt", bag: "Warenkorb", empty: "Warenkorb leer", size: "Größe", required: "Pflicht", optional: "Optional", instructions: "Besondere Wünsche", subtotal: "Zwischensumme", discount: "Rabatt", total: "Gesamt", payment: "Zahlung", cash: "Bar", placeOrder: "Bestellen", ingredients: "Zutaten", language: "Sprache", needTable: "Tischnummer eingeben",
};
const hi: Partial<Dict> = {
  welcome: "आपका स्वागत है", table: "टेबल", picks: "शेफ की पसंद", soldOut: "उपलब्ध नहीं", customise: "अपनी पसंद बनाएं", add: "बैग में जोड़ें", addedToBag: "जोड़ा गया", bag: "आपका बैग", empty: "आपका बैग खाली है", size: "आकार", required: "ज़रूरी", optional: "वैकल्पिक", instructions: "विशेष निर्देश", subtotal: "उप-योग", discount: "छूट", total: "कुल", payment: "भुगतान", cash: "नकद", card_at_table: "टेबल पर कार्ड", online: "ऑनलाइन भुगतान", placeOrder: "ऑर्डर करें", ingredients: "सामग्री", language: "भाषा", needTable: "अपना टेबल नंबर दर्ज करें", assist: "वेटर बुलाएं",
};
const ar: Partial<Dict> = {
  welcome: "مرحبًا بك في", table: "طاولة", picks: "اختيارات الشيف", soldOut: "غير متوفر", customise: "خصص", add: "أضف إلى السلة", addedToBag: "تمت الإضافة", bag: "سلتك", empty: "سلتك فارغة", size: "الحجم", required: "مطلوب", optional: "اختياري", instructions: "تعليمات خاصة", subtotal: "المجموع الفرعي", discount: "خصم", total: "الإجمالي", payment: "الدفع", cash: "نقدًا", card_at_table: "بطاقة على الطاولة", online: "ادفع عبر الإنترنت", placeOrder: "اطلب الآن", ingredients: "المكونات", language: "اللغة", needTable: "أدخل رقم طاولتك", assist: "استدعاء النادل",
};
const D: Record<string, Partial<Dict>> = { en, es, fr, de, hi, ar };
export const t = (lang: string): Dict => ({ ...en, ...(D[lang] ?? {}) });
