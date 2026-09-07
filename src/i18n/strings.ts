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
    back: 'Volver',
    save: 'Guardar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    genericError: 'Algo salió mal. Inténtalo de nuevo.',
    loading: 'Cargando…',
  },

  auth: {
    welcomeTitle: 'Te damos la bienvenida',
    welcomeSubtitle: 'Organización compartida para la crianza entre dos hogares.',
    continueWithGoogle: 'Continuar con Google',
    googleHint: 'Usa tu cuenta de Google. No creamos otra contraseña.',
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
    createHint: 'Serás la primera persona en el hogar',
    joinCta: 'Unirme con un código',
    joinHint: 'Ya recibiste un código de 8 caracteres',
    oneHouseholdNote: 'Cada persona tiene un solo hogar.',

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
      subtitle: 'Ingresa el código que te compartió la otra persona.',
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
      emptySlot: 'Lugar libre',
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

  nav: {
    calendar: 'Calendario',
    household: 'Hogar',
  },

  custody: {
    title: 'Calendario de custodia',
    today: 'Hoy',
    weekdaysShort: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const,
    months: [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ] as const,
    monthLabel: (monthName: string, year: number) => `${monthName} ${year}`,

    withParent: (name: string) => `Con ${name}`,
    theOtherParent: 'la otra persona',

    empty: {
      title: 'Aún no hay un calendario',
      body: 'Configura el patrón de custodia para que el calendario se llene solo.',
      cta: 'Configurar patrón',
    },
    awaitingPattern: (name: string) => `Esperando que ${name} apruebe el patrón de custodia.`,

    pending: {
      one: 'Tienes 1 cambio pendiente de tu respuesta.',
      many: (n: number) => `Tienes ${n} cambios pendientes de tu respuesta.`,
      review: 'Revisar',
      listTitle: 'Cambios pendientes',
      none: 'No hay cambios pendientes.',
      proposedByYou: 'Propuesto por ti',
      proposedBy: (name: string) => `Propuesto por ${name}`,
    },

    day: {
      changeoverAt: (time: string) => `Cambio de casa a las ${time}`,
      untilTime: (time: string) => `hasta las ${time}`,
      fromTime: (time: string) => `desde las ${time}`,
      allDay: 'todo el día',
      propose: 'Proponer un cambio',
      noPattern: 'Sin patrón para este día.',
    },

    proposeOverride: {
      title: (dateLabel: string) => `Proponer un cambio · ${dateLabel}`,
      whoQuestion: '¿Quién tendrá a los niños?',
      allDayToggle: 'Todo el día',
      fromLabel: 'Desde',
      toLabel: 'Hasta',
      timePlaceholder: 'HH:mm',
      submit: 'Enviar propuesta',
      errors: {
        badTime: 'Usa el formato HH:mm (por ejemplo 18:00).',
        order: 'La hora de término debe ser posterior a la de inicio.',
      },
    },

    patternSetup: {
      title: 'Patrón de custodia',
      subtitle: 'La otra persona deberá aprobarlo antes de que aplique.',
      presetLabel: 'Tipo de patrón',
      presets: {
        'alternating-weeks': {
          name: 'Semanas alternadas',
          desc: 'Una semana con cada persona.',
        },
        'every-other-weekend': {
          name: 'Fin de semana alternado',
          desc: 'Entre semana con una persona; un fin de semana sí y otro no con la otra.',
        },
        '2-2-3': {
          name: '2-2-3',
          desc: 'Dos días, dos días y un bloque de tres; se alterna cada semana.',
        },
        custom: { name: 'Personalizado', desc: 'Define el ciclo día por día.' },
      },
      residentialParent: '¿Con quién están normalmente?',
      anchorLabel: '¿Desde qué día empieza el ciclo?',
      changeoverLabel: '¿A qué hora cambian de casa?',
      effectiveFromLabel: '¿Desde cuándo aplica?',
      datePlaceholder: 'AAAA-MM-DD',
      submit: 'Enviar para aprobación',
      errors: {
        badDate: 'Usa el formato AAAA-MM-DD.',
        badTime: 'Usa el formato HH:mm (por ejemplo 18:00).',
        effectiveBeforeAnchor: 'La fecha de inicio no puede ser anterior al inicio del ciclo.',
      },
    },

    proposalSummary: {
      pattern: (presetName: string, dateLabel: string) =>
        `Nuevo patrón: ${presetName}, desde el ${dateLabel}`,
      dayOverride: (dateLabel: string, parentName: string, when: string) =>
        `${dateLabel}: con ${parentName} · ${when}`,
      timeRange: (from: string, to: string) => `de ${from} a ${to}`,
    },

    errors: {
      proposeFailed: 'No se pudo enviar la propuesta. Inténtalo de nuevo.',
      resolveFailed: 'No se pudo completar. Inténtalo de nuevo.',
    },
  },
} as const;
