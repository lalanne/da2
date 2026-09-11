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
    events: 'Eventos',
    receipts: 'Recibos',
    household: 'Hogar',
  },

  // Shared by the DateField / TimeField primitives (spec 009). Weekday and
  // full-month labels come from `custody.weekdaysShort` / `custody.months`.
  dateTime: {
    today: 'Hoy',
    clearDate: 'Quitar fecha',
    chooseDate: 'Elegir fecha',
    timeTitle: 'Hora',
    chooseTime: 'Elegir hora',
    noTime: 'Sin hora',
    monthsShort: [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ] as const,
  },

  receipts: {
    tabTitle: 'Recibos',
    segments: { mine: 'Mis recibos', shared: 'Compartidos' },
    empty: {
      mine: 'Aún no has subido recibos.',
      shared: 'Todavía no hay recibos compartidos.',
    },
    add: 'Agregar recibo',
    private: 'Privado',
    sharedBadge: 'Compartido',
    uncategorized: 'Sin categoría',
    tags: {
      tuition: 'Matrícula',
      medical: 'Médico',
      sports: 'Deporte',
      clothing: 'Ropa',
      other: 'Otro',
    },
    filters: {
      allTags: 'Todas',
      allMonths: 'Todos los meses',
    },

    upload: {
      title: 'Agregar recibo',
      pickSource: '¿De dónde sacamos el recibo?',
      camera: 'Cámara',
      library: 'Galería',
      file: 'Archivo PDF',
      uploading: 'Subiendo…',
      errors: {
        tooLarge: 'El archivo supera los 10 MB.',
        badType: 'Solo se aceptan imágenes o PDF.',
        cancelled: 'No se seleccionó ningún archivo.',
        permission: 'Necesitamos permiso para usar la cámara o la galería.',
      },
    },

    form: {
      amountLabel: 'Monto',
      amountPlaceholder: '12500',
      tagsLabel: 'Etiquetas (opcional)',
      tagsHint: 'Puedes elegir varias, o ninguna. Sin etiquetas queda como "Sin categoría".',
      dateLabel: 'Fecha del gasto',
      childLabel: '¿Para quién? (opcional)',
      noChild: 'Sin especificar',
      noteLabel: 'Nota (opcional)',
      submit: 'Guardar recibo',
      errors: {
        badAmount: 'Ingresa un monto válido.',
        badDate: 'Usa el formato AAAA-MM-DD.',
      },
    },

    detail: {
      openPdf: 'Abrir PDF',
      share: 'Compartir con la otra persona',
      shareConfirm:
        'Se compartirá este recibo con la otra persona y no se puede deshacer. ¿Continuar?',
      delete: 'Eliminar',
      deleteConfirm: '¿Eliminar este recibo?',
      tagsLabel: 'Etiquetas',
      uploadedByYou: 'Subido por ti',
      uploadedBy: (name: string) => `Subido por ${name}`,
      loadingFile: 'Cargando archivo…',
      fileError: 'No se pudo cargar el archivo.',
    },

    errors: {
      uploadFailed: 'No se pudo subir el recibo. Inténtalo de nuevo.',
      shareFailed: 'No se pudo compartir. Inténtalo de nuevo.',
      deleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.',
    },
  },

  events: {
    tabTitle: 'Próximos eventos',
    empty: 'Aún no hay eventos. Agrega el primero.',
    add: 'Agregar evento',
    types: {
      doctor: 'Médico',
      birthday: 'Cumpleaños',
      tournament: 'Torneo',
      training: 'Entrenamiento',
      school: 'Colegio',
      other: 'Otro',
    },
    allDay: 'Todo el día',
    forChildren: (names: string) => `Para ${names}`,
    forHousehold: 'Para toda la casa',
    weeklyUntil: (dateLabel: string) => `Se repite cada semana hasta el ${dateLabel}`,
    editedBy: (name: string) => `Editado por ${name}`,
    dayHeading: 'Eventos del día',

    detail: {
      edit: 'Editar',
      delete: 'Eliminar',
      deleteConfirm: '¿Eliminar este evento? También se eliminan sus repeticiones.',
    },

    form: {
      newTitle: 'Nuevo evento',
      editTitle: 'Editar evento',
      titleLabel: 'Título',
      titlePlaceholder: 'Ej: Dentista',
      typeLabel: 'Tipo',
      childrenLabel: '¿Para quién?',
      allChildren: 'Toda la casa',
      dateLabel: 'Fecha',
      allDayToggle: 'Todo el día',
      startLabel: 'Desde',
      endLabel: 'Hasta',
      locationLabel: 'Lugar (opcional)',
      notesLabel: 'Notas (opcional)',
      repeatsToggle: 'Se repite cada semana',
      untilLabel: 'Hasta la fecha',
      submitNew: 'Guardar evento',
      submitEdit: 'Guardar cambios',
      errors: {
        missingTitle: 'Ingresa un título.',
        badDate: 'Usa el formato AAAA-MM-DD.',
        badTime: 'Usa el formato HH:mm (por ejemplo 15:00).',
        timeOrder: 'La hora de término debe ser posterior a la de inicio.',
        recurrenceType: 'Solo los entrenamientos pueden repetirse.',
        untilBeforeDate: 'La fecha de término debe ser posterior a la del evento.',
      },
    },

    errors: {
      saveFailed: 'No se pudo guardar el evento. Inténtalo de nuevo.',
      deleteFailed: 'No se pudo eliminar el evento. Inténtalo de nuevo.',
    },
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

  // Spec 010 — expense splitting.
  split: {
    balance: {
      settled: 'Están a mano',
      owes: (debtor: string, amount: string) => `${debtor} te debe ${amount}`,
      youOwe: (creditor: string, amount: string) => `Le debes ${amount} a ${creditor}`,
      recordPayment: 'Registrar pago',
      seeDetail: 'Ver detalle',
      needsTable: 'Primero define el reparto de gastos.',
      defineTable: 'Definir reparto',
    },
    detail: {
      title: 'Balance',
      paidBy: (name: string) => `pagó ${name}`,
      paidByYou: 'pagaste tú',
      yourShare: (amount: string) => `tu parte ${amount}`,
      theirShare: (name: string, amount: string) => `${name} ${amount}`,
      settlementsHeading: 'Pagos entre ustedes',
      noSettlements: 'Aún no hay pagos registrados.',
      empty: 'Todavía no hay recibos compartidos.',
    },
    settlement: {
      pending: 'Pendiente de confirmar',
      confirmed: 'Confirmado',
      rejected: 'Rechazado',
      confirm: 'Confirmar',
      reject: 'Rechazar',
      cancel: 'Cancelar',
      recordedByYou: 'Registrado por ti',
      line: (payer: string, payee: string, amount: string) => `${payer} → ${payee}: ${amount}`,
      form: {
        title: 'Registrar un pago',
        iPaid: 'Yo pagué',
        theyPaid: (name: string) => `Me pagó ${name}`,
        amountLabel: 'Monto',
        noteLabel: 'Nota (opcional)',
        submit: 'Registrar',
      },
    },
    table: {
      title: 'Reparto de gastos',
      byDefault: 'Por defecto',
      usesDefault: 'por defecto',
      activeSince: (dateLabel: string, approver: string) =>
        `Vigente desde el ${dateLabel} · aprobado por ${approver}`,
      notSet: 'Aún no acuerdan un reparto. Propón uno para empezar a compartir gastos.',
      propose: 'Proponer un cambio',
      proposeFirst: 'Proponer un reparto',
    },
    propose: {
      title: 'Proponer un reparto',
      subtitle: (approver: string) =>
        `Ajusta el % en pasos de 5; ${approver} tendrá que aprobar el cambio.`,
      addRule: 'Añadir regla',
      removeRule: 'Quitar',
      submit: (approver: string) => `Enviar propuesta a ${approver}`,
    },
    pendingBanner: {
      forResponder: (proposer: string) => `${proposer} propone un cambio al reparto de gastos.`,
      forProposer: 'Esperando que la otra persona apruebe tu propuesta de reparto.',
      approve: 'Aprobar',
      reject: 'Rechazar',
      cancel: 'Cancelar propuesta',
    },
    share: {
      chooseRule: '¿Qué regla de reparto aplica a este recibo?',
      rule: (tagLabel: string, a: number, b: number) => `${tagLabel} — ${a}% / ${b}%`,
    },
    receiptRow: {
      heading: 'Reparto',
      you: (amount: string, pct: number) => `Tú ${amount} (${pct}%)`,
      other: (name: string, amount: string, pct: number) => `${name} ${amount} (${pct}%)`,
    },
    errors: {
      badPercent: 'El porcentaje debe estar entre 0 y 100.',
      badAmount: 'Ingresa un monto válido.',
      proposeFailed: 'No se pudo enviar la propuesta. Inténtalo de nuevo.',
      resolveFailed: 'No se pudo completar. Inténtalo de nuevo.',
      settlementFailed: 'No se pudo registrar el pago. Inténtalo de nuevo.',
    },
  },
} as const;
