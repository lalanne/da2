/**
 * Single source of user-facing copy. Spec 000 constraint: the app is
 * Spanish (Latin American neutral), v1 Spanish-only. No i18n library and no
 * language picker yet — every screen imports from here so another locale can
 * be slotted in later without touching call sites.
 *
 * Style: `tú` form, neutral Latin American vocabulary (no `vosotros`,
 * `móvil`, `coger`, …). Where Spanish forces a gendered word we prefer a
 * neutral phrasing ("te damos la bienvenida" over "bienvenido/a").
 */
const CO_PARENT = 'tu co-madre o co-padre';

export const strings = {
  common: {
    coParent: CO_PARENT,
    retry: 'Reintentar',
    cancel: 'Cancelar',
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
    loading: 'Cargando…',
  },

  auth: {
    welcomeTitle: 'Te damos la bienvenida',
    welcomeSubtitle: 'Organización compartida para la crianza entre dos hogares.',
    continueWithGoogle: 'Continuar con Google',
    signOut: 'Cerrar sesión',
    errors: {
      signInCancelled: 'Se canceló el inicio de sesión.',
      networkError: 'Error de conexión. Inténtalo de nuevo.',
      playServicesUnavailable: 'Necesitas Google Play Services para iniciar sesión.',
      unknown: 'Algo salió mal. Inténtalo de nuevo.',
    },
  },

  main: {
    greeting: (name: string | null | undefined) => (name ? `Hola, ${name}` : 'Hola'),
  },

  household: {
    onboardingTitle: 'Configura tu hogar',
    onboardingSubtitle:
      'Crea un hogar y agrega a tus hijos e hijas, o únete al hogar que ya creó ' +
      'la otra persona con un código de invitación.',
    createCta: 'Crear un hogar',
    joinCta: 'Unirme con un código',

    create: {
      title: 'Crear un hogar',
      nameLabel: 'Nombre del hogar',
      namePlaceholder: 'Ej: Los niños de García',
      childrenLabel: 'Hijos e hijas',
      childNamePlaceholder: 'Nombre',
      childBirthdatePlaceholder: 'Fecha de nacimiento (opcional)',
      addChild: 'Agregar hijo/a',
      removeChild: 'Quitar',
      submit: 'Crear hogar',
      errors: {
        missingName: 'Ingresa un nombre para el hogar.',
        noChildren: 'Agrega al menos un hijo o hija con nombre.',
        badBirthdate: 'Usa el formato AAAA-MM-DD para la fecha de nacimiento.',
      },
    },

    join: {
      title: 'Unirme a un hogar',
      codeLabel: 'Código de invitación',
      codePlaceholder: 'ABCD2345',
      submit: 'Unirme',
      resuming: 'Retomando una unión que quedó a medias…',
      errors: {
        badFormat: 'El código tiene 8 caracteres (letras y números).',
        invalid: 'El código no es válido o ya se usó.',
        householdFull: 'Ese hogar ya tiene dos adultos.',
        failed: 'No se pudo completar la unión. Inténtalo de nuevo.',
      },
    },

    settings: {
      title: 'Integrantes del hogar',
      you: 'Tú',
      waitingForCoParent: `Esperando a que se una ${CO_PARENT}.`,
      inviteCodeHeading: 'Código de invitación',
      inviteCodeHelp: `Compártelo con ${CO_PARENT}. Sirve una sola vez.`,
      inviteCodeCopyHint: 'Mantén presionado el código para copiarlo.',
      share: 'Compartir código',
      shareMessage: (code: string, householdName: string) =>
        `Únete a "${householdName}" en da2 con este código: ${code}`,
      regenerate: 'Generar un código nuevo',
      regenerateConfirm: 'El código anterior dejará de funcionar. ¿Generar uno nuevo?',
      childrenHeading: 'Hijos e hijas',
    },
  },
} as const;
