import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'en' | 'ur';

const translations = {
  en: {
    // Nav
    dashboard: 'Dashboard',
    inventory: 'Stock In',
    sales: 'Sales',
    customerLedger: 'Customer Ledger',
    millLedger: 'Mill Ledger',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Logout',
    appName: 'Factory POS',

    // Dashboard
    todaySales: "Today's Sales",
    monthlySales: 'Monthly Sales',
    totalProfit: 'Total Profit',
    customerPending: 'Customer Pending',
    millDues: 'Mill Dues',
    overdueCount: 'Overdue Sales',
    overdueAlerts: 'Overdue Alerts',
    dueThisWeek: 'Due This Week',
    recentSales: 'Recent Sales',
    stockSummary: 'Stock Summary',
    weeklySalesChart: 'Weekly Sales (Last 7 Days)',
    stockChart: 'Current Stock Levels',
    customer: 'Customer',
    amount: 'Amount',
    dueDate: 'Due Date',
    daysOverdue: 'Days Overdue',
    status: 'Status',
    product: 'Product',
    currentStock: 'Current Stock',
    unit: 'Unit',
    date: 'Date',
    total: 'Total',
    noData: 'No data available',
    loading: 'Loading...',
    applyFilter: 'Apply Filter',
    loadingReports: 'Loading reports...',
    selectSupplier: 'Select Supplier',
    quantityWeight: 'Quantity / Weight',
    amountPaidNow: 'Amount Paid Now',
    typeBrand: 'Type/Brand',
    stock: 'Stock',
    lastUpdated: 'Last Updated',
    purchasedPKR: 'Purchased (PKR)',
    soldPKR: 'Sold (PKR)',
    productWiseSalesProfit: 'Product-wise Sales & Profit',
    purchaseVolume: 'Purchase Volume',
    newBrand: 'New Brand',
    linkSupplier: 'Link Supplier',
    suppliersManager: 'Suppliers Manager',
    contactPerson: 'Contact Person',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordChanged: 'Password changed successfully',
    passwordChangeFailed: 'Password change failed',
    addPayment: 'Add Payment',
    recordPayment: 'Record Payment',
    submit: 'Submit',

    // Sales page
    newSale: 'New Sale',
    customerName: 'Customer Name',
    customerPhone: 'Phone',
    selectCustomer: 'Select Customer',
    selectProduct: 'Select Product',
    selectBrand: 'Select Brand',
    quantity: 'Quantity',
    price: 'Price (per unit)',
    addItem: '+ Add Item',
    removeItem: 'Remove',
    creditSale: 'Credit Sale',
    creditDays: 'Credit Days',
    payNow: 'Amount Paid Now',
    totalAmount: 'Total Amount',
    pendingAmount: 'Pending Amount',
    completeSale: 'Complete Sale',
    saleHistory: 'Sale History',
    items: 'Items',
    paid: 'Paid',
    partial: 'Partial',
    pending: 'Pending',
    overdue: 'Overdue',

    // Inventory page
    addStock: 'Add Stock',
    supplier: 'Supplier',
    cementBrand: 'Cement Brand',
    purchasePrice: 'Purchase Price/Unit',
    quantityReceived: 'Quantity Received',
    totalCost: 'Total Cost',
    amountPaid: 'Amount Paid to Mill',
    amountPending: 'Amount Pending to Mill',
    paymentStatus: 'Payment Status',
    notes: 'Notes',
    addInventory: 'Add Inventory',
    stockHistory: 'Stock History',
    currentStockLevel: 'Current Stock',

    // Customer Ledger
    customerLedgerTitle: 'Customer Ledger',
    allCustomers: 'All',
    withBalance: 'Has Balance',
    overdueOnly: 'Overdue',
    collectPayment: 'Collect Payment',
    totalOwed: 'Total Credit',
    totalPaid: 'Total Received',
    balance: 'Balance',
    collectAmount: 'Amount to Collect',
    collect: 'Collect',
    cancel: 'Cancel',

    // Mill Ledger
    millLedgerTitle: 'Mill / Supplier Ledger',
    allSuppliers: 'All',
    hasBalance: 'Has Balance',
    payMill: 'Pay Supplier',
    totalPurchased: 'Total Purchased',
    amountPaidLabel: 'Amount Paid',
    amountDue: 'Amount Due',
    payAmount: 'Amount to Pay',
    pay: 'Pay',

    // Reports
    reportsTitle: 'Reports',
    totalSales: 'Total Sales',
    totalReceived: 'Total Received',
    customerReceivable: 'Customer Receivable',
    millPayable: 'Mill Payable',
    profitReport: 'Profit Report',
    stockReport: 'Stock Report',
    topCustomers: 'Top Customers',
    profit: 'Profit',
    sale: 'Sale',

    // Settings
    settingsTitle: 'Settings',
    addProduct: 'Add Product',
    productName: 'Product Name',
    unitLabel: 'Unit (bags/kg/ton)',
    addProductBtn: 'Add Product',
    brandManager: 'Cement Brands',
    brandName: 'Brand Name',
    addBrand: 'Add Brand',
    supplierManager: 'Suppliers',
    supplierName: 'Supplier Name',
    phone: 'Phone',
    addSupplier: 'Add Supplier',
    addCustomer: 'Add Customer',
    customerManager: 'Customers',
    address: 'Address',

    // Misc
    pkr: 'PKR',
    bags: 'bags',
    yes: 'Yes',
    no: 'No',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    search: 'Search...',
  },

  ur: {
    // Nav
    dashboard: 'ڈیش بورڈ',
    inventory: 'اسٹاک داخل',
    sales: 'فروخت',
    customerLedger: 'گاہک کھاتہ',
    millLedger: 'مل کھاتہ',
    reports: 'رپورٹس',
    settings: 'سیٹنگز',
    logout: 'لاگ آوٹ',
    appName: 'فیکٹری POS',

    // Dashboard
    todaySales: 'آج کی فروخت',
    monthlySales: 'ماہانہ فروخت',
    totalProfit: 'کل منافع',
    customerPending: 'گاہک باقی',
    millDues: 'مل واجبات',
    overdueCount: 'زائد مدت',
    overdueAlerts: 'زائد مدت الرٹس',
    dueThisWeek: 'اس ہفتے میعاد',
    recentSales: 'حالیہ فروخت',
    stockSummary: 'اسٹاک خلاصہ',
    weeklySalesChart: 'ہفتہ وار فروخت',
    stockChart: 'اسٹاک سطح',
    customer: 'گاہک',
    amount: 'رقم',
    dueDate: 'میعاد تاریخ',
    daysOverdue: 'زائد دن',
    status: 'صورتحال',
    product: 'پروڈکٹ',
    currentStock: 'موجودہ اسٹاک',
    unit: 'اکائی',
    date: 'تاریخ',
    total: 'کل',
    noData: 'ڈیٹا دستیاب نہیں',
    loading: 'لوڈ ہو رہا ہے...',
    applyFilter: 'فلٹر لگائیں',
    loadingReports: 'رپورٹس لوڈ ہو رہی ہیں...',
    selectSupplier: 'سپلائر منتخب کریں',
    quantityWeight: 'مقدار / وزن',
    amountPaidNow: 'ابھی ادا شدہ رقم',
    typeBrand: 'قسم/برانڈ',
    stock: 'اسٹاک',
    lastUpdated: 'آخری اپڈیٹ',
    purchasedPKR: 'خرید (روپے)',
    soldPKR: 'فروخت (روپے)',
    productWiseSalesProfit: 'پروڈکٹ وار فروخت اور منافع',
    purchaseVolume: 'خریداری حجم',
    newBrand: 'نیا برانڈ',
    linkSupplier: 'سپلائر لنک کریں',
    suppliersManager: 'سپلائر مینیجر',
    contactPerson: 'رابطہ شخص',
    changePassword: 'پاس ورڈ تبدیل کریں',
    currentPassword: 'موجودہ پاس ورڈ',
    newPassword: 'نیا پاس ورڈ',
    confirmPassword: 'پاس ورڈ کی تصدیق',
    passwordChanged: 'پاس ورڈ کامیابی سے تبدیل ہوگیا',
    passwordChangeFailed: 'پاس ورڈ تبدیل نہیں ہوسکا',
    addPayment: 'ادائیگی شامل کریں',
    recordPayment: 'ادائیگی درج کریں',
    submit: 'جمع کریں',

    // Sales page
    newSale: 'نئی فروخت',
    customerName: 'گاہک کا نام',
    customerPhone: 'فون',
    selectCustomer: 'گاہک منتخب کریں',
    selectProduct: 'پروڈکٹ منتخب کریں',
    selectBrand: 'برانڈ منتخب کریں',
    quantity: 'مقدار',
    price: 'قیمت (فی یونٹ)',
    addItem: '+ چیز شامل کریں',
    removeItem: 'ہٹائیں',
    creditSale: 'اُدھار فروخت',
    creditDays: 'اُدھار دن',
    payNow: 'ابھی ادا کی گئی رقم',
    totalAmount: 'کل رقم',
    pendingAmount: 'باقی رقم',
    completeSale: 'فروخت مکمل کریں',
    saleHistory: 'فروخت تاریخ',
    items: 'اشیاء',
    paid: 'ادا شدہ',
    partial: 'جزوی',
    pending: 'باقی',
    overdue: 'زائد مدت',

    // Inventory page
    addStock: 'اسٹاک شامل کریں',
    supplier: 'سپلائر',
    cementBrand: 'سیمنٹ برانڈ',
    purchasePrice: 'خریداری قیمت/یونٹ',
    quantityReceived: 'موصول مقدار',
    totalCost: 'کل لاگت',
    amountPaid: 'مل کو ادا شدہ',
    amountPending: 'مل کو باقی',
    paymentStatus: 'ادائیگی حالت',
    notes: 'نوٹس',
    addInventory: 'اسٹاک داخل کریں',
    stockHistory: 'اسٹاک تاریخ',
    currentStockLevel: 'موجودہ اسٹاک',

    // Customer Ledger
    customerLedgerTitle: 'گاہک کھاتہ',
    allCustomers: 'سب',
    withBalance: 'بقایا',
    overdueOnly: 'زائد مدت',
    collectPayment: 'رقم وصول کریں',
    totalOwed: 'کل اُدھار',
    totalPaid: 'کل وصول',
    balance: 'بقایا',
    collectAmount: 'وصول کی جانے والی رقم',
    collect: 'وصول کریں',
    cancel: 'منسوخ',

    // Mill Ledger
    millLedgerTitle: 'مل / سپلائر کھاتہ',
    allSuppliers: 'سب',
    hasBalance: 'بقایا',
    payMill: 'سپلائر کو ادائیگی',
    totalPurchased: 'کل خریداری',
    amountPaidLabel: 'ادا شدہ رقم',
    amountDue: 'واجب الادا',
    payAmount: 'ادا کی جانے والی رقم',
    pay: 'ادا کریں',

    // Reports
    reportsTitle: 'رپورٹس',
    totalSales: 'کل فروخت',
    totalReceived: 'کل وصول',
    customerReceivable: 'گاہک وصولیاں',
    millPayable: 'مل واجبات',
    profitReport: 'منافع رپورٹ',
    stockReport: 'اسٹاک رپورٹ',
    topCustomers: 'ٹاپ گاہک',
    profit: 'منافع',
    sale: 'فروخت',

    // Settings
    settingsTitle: 'سیٹنگز',
    addProduct: 'پروڈکٹ شامل کریں',
    productName: 'پروڈکٹ کا نام',
    unitLabel: 'اکائی',
    addProductBtn: 'پروڈکٹ شامل کریں',
    brandManager: 'سیمنٹ برانڈز',
    brandName: 'برانڈ نام',
    addBrand: 'برانڈ شامل کریں',
    supplierManager: 'سپلائرز',
    supplierName: 'سپلائر نام',
    phone: 'فون',
    addSupplier: 'سپلائر شامل کریں',
    addCustomer: 'گاہک شامل کریں',
    customerManager: 'گاہکان',
    address: 'پتہ',

    // Misc
    pkr: 'روپے',
    bags: 'بوری',
    yes: 'ہاں',
    no: 'نہیں',
    delete: 'حذف',
    edit: 'ترمیم',
    save: 'محفوظ',
    search: 'تلاش...',
  },
};

export type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isUrdu: boolean;
}

export const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
  isUrdu: false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('pos_lang') as Lang) || 'en');
  const isUrdu = lang === 'ur';
  const t = translations[lang];

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('pos_lang', l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang: switchLang, t, isUrdu }}>
      <div dir={isUrdu ? 'rtl' : 'ltr'} className={isUrdu ? 'font-urdu' : ''}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
