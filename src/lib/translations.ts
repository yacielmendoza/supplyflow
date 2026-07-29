export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Header & Nav
    appName: 'RestoSupply',
    profileSettings: 'Configuración de Perfil',
    changeUser: 'Cambiar Perfil y Vista',
    online: 'En línea',
    reconnecting: 'Reconectando',
    installApp: 'Instalar App',
    
    // Nav Tabs
    navRequests: 'Pedidos & Actividad Diaria',
    navChecklist: 'Inspección Diaria de Stock',
    navAdmin: 'Catálogo & Mínimos',
    navAnalytics: 'Métricas & Control',
    navPurchaseRequests: 'Solicitudes de Compra',

    // Roles
    roleCook: 'Cocina',
    roleBuyer: 'Runner / Comprador',
    roleAdmin: 'Admin / Propietario',

    // Statuses
    pending: 'Pendiente',
    assigned: 'Asignada',
    inProgress: 'En Compra',
    purchased: 'Comprada',
    delivered: 'Entregada',
    completed: 'Completada',

    // Settings Modal
    settingsTitle: 'Configuración de Perfil y Preferencias',
    profilePicture: 'Foto de Perfil / Avatar',
    personalDetails: 'Detalles Personales',
    fullName: 'Nombre Completo',
    email: 'Correo Electrónico',
    phoneWhatsApp: 'Teléfono / WhatsApp',
    phoneHelp: 'Número para recibir notificaciones y mensajes de alertas.',
    languagePreference: 'Idioma de la Interfaz',
    spanish: 'Español 🇲🇽',
    english: 'English 🇺🇸',
    themePreference: 'Tema Visual',
    themeDark: 'Oscuro (Modo Noche)',
    themeLight: 'Claro (Alto Contraste)',
    saveChanges: 'Guardar Cambios',
    cancel: 'Cancelar',
    savedSuccess: '¡Perfil actualizado correctamente!',
    avatarPreset1: 'Cocinero',
    avatarPreset2: 'Runner',
    avatarPreset3: 'Admin',
    avatarPresetCustom: 'URL Personalizada',
  },
  en: {
    // Header & Nav
    appName: 'RestoSupply',
    profileSettings: 'Profile Settings',
    changeUser: 'Switch Profile & View',
    online: 'Online',
    reconnecting: 'Reconnecting',
    installApp: 'Install App',

    // Nav Tabs
    navRequests: 'Orders & Daily Activity',
    navChecklist: 'Daily Stock Audit',
    navAdmin: 'Catalog & Thresholds',
    navAnalytics: 'Metrics & Control',
    navPurchaseRequests: 'Purchase Requests',

    // Roles
    roleCook: 'Kitchen',
    roleBuyer: 'Runner / Buyer',
    roleAdmin: 'Admin / Owner',

    // Statuses
    pending: 'Pending',
    assigned: 'Assigned',
    inProgress: 'In Shopping',
    purchased: 'Purchased',
    delivered: 'Delivered',
    completed: 'Completed',

    // Settings Modal
    settingsTitle: 'Profile Settings & Preferences',
    profilePicture: 'Profile Picture / Avatar',
    personalDetails: 'Personal Details',
    fullName: 'Full Name',
    email: 'Email Address',
    phoneWhatsApp: 'Phone / WhatsApp',
    phoneHelp: 'Number for receiving notification alerts and messages.',
    languagePreference: 'Interface Language',
    spanish: 'Spanish 🇲🇽',
    english: 'English 🇺🇸',
    themePreference: 'Visual Theme',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    savedSuccess: 'Profile updated successfully!',
    avatarPreset1: 'Chef',
    avatarPreset2: 'Runner',
    avatarPreset3: 'Admin',
    avatarPresetCustom: 'Custom URL',
  },
};

export function getTranslation(lang: Language = 'es') {
  return translations[lang] || translations.es;
}
