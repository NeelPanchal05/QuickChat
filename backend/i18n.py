"""
Multi-language support for QuickChat
"""

TRANSLATIONS = {
    'en': {
        'welcome': 'Welcome to QuickChat',
        'login': 'Login',
        'register': 'Register',
        'verify_otp': 'Verify OTP',
        'send_message': 'Send Message',
        'search_users': 'Search Users',
        'start_call': 'Start Call',
        'end_call': 'End Call',
        'online': 'Online',
        'offline': 'Offline',
        'typing': 'Typing...',
        'user_not_found': 'User not found',
        'invalid_credentials': 'Invalid credentials',
        'otp_expired': 'OTP expired',
        'message_sent': 'Message sent',
        'message_deleted': 'Message deleted',
        'chat_archived': 'Chat archived',
        'user_blocked': 'User blocked',
    },
    'es': {
        'welcome': 'Bienvenido a QuickChat',
        'login': 'Iniciar sesión',
        'register': 'Registrarse',
        'verify_otp': 'Verificar OTP',
        'send_message': 'Enviar mensaje',
        'search_users': 'Buscar usuarios',
        'start_call': 'Iniciar llamada',
        'end_call': 'Finalizar llamada',
        'online': 'En línea',
        'offline': 'Desconectado',
        'typing': 'Escribiendo...',
        'user_not_found': 'Usuario no encontrado',
        'invalid_credentials': 'Credenciales inválidas',
        'otp_expired': 'OTP expirado',
        'message_sent': 'Mensaje enviado',
        'message_deleted': 'Mensaje eliminado',
        'chat_archived': 'Chat archivado',
        'user_blocked': 'Usuario bloqueado',
    },
    'fr': {
        'welcome': 'Bienvenue sur QuickChat',
        'login': 'Connexion',
        'register': 'S\'inscrire',
        'verify_otp': 'Vérifier OTP',
        'send_message': 'Envoyer un message',
        'search_users': 'Rechercher des utilisateurs',
        'start_call': 'Démarrer un appel',
        'end_call': 'Terminer l\'appel',
        'online': 'En ligne',
        'offline': 'Hors ligne',
        'typing': 'Tapant...',
        'user_not_found': 'Utilisateur non trouvé',
        'invalid_credentials': 'Identifiants invalides',
        'otp_expired': 'OTP expiré',
        'message_sent': 'Message envoyé',
        'message_deleted': 'Message supprimé',
        'chat_archived': 'Chat archivé',
        'user_blocked': 'Utilisateur bloqué',
    },
    'de': {
        'welcome': 'Willkommen bei QuickChat',
        'login': 'Anmelden',
        'register': 'Registrieren',
        'verify_otp': 'OTP überprüfen',
        'send_message': 'Nachricht senden',
        'search_users': 'Benutzer suchen',
        'start_call': 'Anruf starten',
        'end_call': 'Anruf beenden',
        'online': 'Online',
        'offline': 'Offline',
        'typing': 'Tipt...',
        'user_not_found': 'Benutzer nicht gefunden',
        'invalid_credentials': 'Ungültige Anmeldeinformationen',
        'otp_expired': 'OTP abgelaufen',
        'message_sent': 'Nachricht gesendet',
        'message_deleted': 'Nachricht gelöscht',
        'chat_archived': 'Chat archiviert',
        'user_blocked': 'Benutzer blockiert',
    }
}

def get_translation(language: str, key: str, default: str = None) -> str:
    """Get translated text for a given language and key"""
    if language not in TRANSLATIONS:
        language = 'en'
    
    translated = TRANSLATIONS[language].get(key, default or key)
    return translated

def get_all_languages() -> list:
    """Get list of supported languages"""
    return list(TRANSLATIONS.keys())

def add_translation(language: str, key: str, value: str):
    """Add or update a translation"""
    if language not in TRANSLATIONS:
        TRANSLATIONS[language] = {}
    
    TRANSLATIONS[language][key] = value
