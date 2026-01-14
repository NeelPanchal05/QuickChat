import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
  en: {
    settings: "Settings",
    appearance: "Appearance",
    dark_theme: "Dark Theme",
    light_theme: "Light Theme",
    notifications: "Notifications",
    sound_on: "Sound On",
    sound_off: "Sound Off",
    language: "Language",
    account: "Account",
    view_profile: "View Profile",
    terms: "Terms & Conditions",
    logout: "Logout",
    search_placeholder: "Search users...",
    start_chatting: "Start chatting...",
    type_message: "Type a message...",
    online: "Online",
    offline: "Offline",
    chat_wallpapers: "Chat Wallpapers",
    blocked_users: "Blocked Users",
    privacy: "Privacy & Security",
    invite_friend: "Invite a Friend",
    clear_chat: "Clear Chat",
    delete_conv: "Delete",
    view_location: "View Location",
    attached_file: "Attached File",
    poll: "Poll",
  },
  es: {
    settings: "Ajustes",
    appearance: "Apariencia",
    dark_theme: "Tema Oscuro",
    light_theme: "Tema Claro",
    notifications: "Notificaciones",
    sound_on: "Sonido Activado",
    sound_off: "Sonido Desactivado",
    language: "Idioma",
    account: "Cuenta",
    view_profile: "Ver Perfil",
    terms: "Términos y Condiciones",
    logout: "Cerrar Sesión",
    search_placeholder: "Buscar usuarios...",
    start_chatting: "Empieza a chatear...",
    type_message: "Escribe un mensaje...",
    online: "En línea",
    offline: "Desconectado",
    chat_wallpapers: "Fondos de Chat",
    blocked_users: "Usuarios Bloqueados",
    privacy: "Privacidad y Seguridad",
    invite_friend: "Invitar a un amigo",
    clear_chat: "Limpiar Chat",
    delete_conv: "Eliminar",
    view_location: "Ver Ubicación",
    attached_file: "Archivo Adjunto",
    poll: "Encuesta",
  },
  fr: {
    settings: "Paramètres",
    appearance: "Apparence",
    dark_theme: "Thème Sombre",
    light_theme: "Thème Clair",
    notifications: "Notifications",
    sound_on: "Son Activé",
    sound_off: "Son Désactivé",
    language: "Langue",
    account: "Compte",
    view_profile: "Voir le Profil",
    terms: "Termes et Conditions",
    logout: "Se Déconnecter",
    search_placeholder: "Rechercher...",
    start_chatting: "Commencez à discuter...",
    type_message: "Écrivez un message...",
    online: "En ligne",
    offline: "Hors ligne",
    chat_wallpapers: "Fonds d'écran",
    blocked_users: "Utilisateurs Bloqués",
    privacy: "Confidentialité",
    invite_friend: "Inviter un ami",
    clear_chat: "Effacer la discussion",
    delete_conv: "Supprimer",
    view_location: "Voir la position",
    attached_file: "Fichier Joint",
    poll: "Sondage",
  },
  de: {
    settings: "Einstellungen",
    appearance: "Aussehen",
    dark_theme: "Dunkles Design",
    light_theme: "Helles Design",
    notifications: "Benachrichtigungen",
    sound_on: "Ton An",
    sound_off: "Ton Aus",
    language: "Sprache",
    account: "Konto",
    view_profile: "Profil ansehen",
    terms: "AGB",
    logout: "Abmelden",
    search_placeholder: "Nutzer suchen...",
    start_chatting: "Chatten starten...",
    type_message: "Nachricht schreiben...",
    online: "Online",
    offline: "Offline",
    chat_wallpapers: "Chat-Hintergründe",
    blocked_users: "Blockierte Nutzer",
    privacy: "Privatsphäre",
    invite_friend: "Freund einladen",
    clear_chat: "Chat leeren",
    delete_conv: "Löschen",
    view_location: "Standort anzeigen",
    attached_file: "Angehängte Datei",
    poll: "Umfrage",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    localStorage.getItem("app_language") || "en"
  );

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
