/**
 * Vietnamese message catalogue.
 *
 * Typed as `Messages`, so a key added to `en.ts` becomes a compile error here until it
 * is translated — there is no silent English fallback.
 *
 * Voice notes, matching the design system's "calm, plain, practical" register:
 * - Vietnamese has no plural inflection, so counted nouns stay unchanged ("3 ngày").
 *   The pluralising helpers in `en.ts` are simply not needed here.
 * - Pronouns are dropped wherever Vietnamese would naturally drop them; "bạn" is used
 *   only where the sentence would otherwise be ambiguous.
 * - Instructional sentences use the plain imperative ("Đặt trước 3 ngày"), matching the
 *   English "Book 3 days before" rather than a softened polite form.
 */
import type { IssueRenderers, Messages } from './en';

const count = (n: number, noun: string) => `${n} ${noun}`;

export const vi: Messages = {
  meta: {
    locale: 'vi-VN',
    name: 'Tiếng Việt',
  },

  app: {
    name: 'Wayfare',
    tagline: 'Chuyến đi của bạn, theo từng ngày',
    skipToContent: 'Bỏ qua, đến nội dung chính',
  },

  common: {
    back: 'Quay lại',
    close: 'Đóng',
    cancel: 'Huỷ',
    dismiss: 'Bỏ qua',
    tryAgain: 'Thử lại',
    review: 'Xem lại',
    search: 'Tìm kiếm',
    filter: 'Lọc',
    clearFilters: 'Xoá bộ lọc',
    opensInNewTab: '(mở trong tab mới)',
    notPriced: 'Chưa có giá',
    noLinkGiven: 'Không có liên kết',
    viewSource: 'Xem nguồn',
    routeTo: 'đến',
    hours: (n) => `${n} giờ`,
    minutes: (n) => `${n} phút`,
    days: (n) => count(n, 'ngày'),
    activities: (n) => count(n, 'hoạt động'),
    travelers: (n) => count(n, 'người'),
    bookings: (n) => count(n, 'mục cần đặt'),
    sources: (n) => count(n, 'nguồn'),
    sheets: (n) => count(n, 'trang tính'),
    rows: (n) => count(n, 'dòng'),
    issues: (n) => count(n, 'vấn đề'),
    things: (n) => count(n, 'mục'),
  },

  nav: {
    primary: 'Chính',
    home: 'Trang chính',
    itinerary: 'Lịch trình',
    budget: 'Chi phí',
    bookings: 'Đặt chỗ',
    more: 'Thêm',
    sources: 'Nguồn & giả định',
    issues: 'Vấn đề dữ liệu',
    importDetails: 'Chi tiết nhập tệp',
    unresolvedIssues: 'Vấn đề dữ liệu chưa xử lý',
    settingsAndData: 'Cài đặt & dữ liệu',
  },

  header: {
    import: { title: 'Nhập tệp', subtitle: 'Đọc bảng tính của bạn' },
    itinerary: 'Lịch trình',
    dayOf: (day, total) => `Ngày ${day} / ${total}`,
    activity: 'Hoạt động',
    budget: { title: 'Chi phí', subtitle: 'Cơ bản và dự phòng' },
    bookings: { title: 'Đặt chỗ', subtitle: 'Cần đặt gì, và khi nào' },
    sources: { title: 'Nguồn', subtitle: 'Kế hoạch dựa trên điều gì' },
    issues: { title: 'Vấn đề dữ liệu', subtitle: 'Từ lần nhập tệp' },
    more: 'Thêm',
  },

  traveler: {
    placeholder: (slot) => `Người ${slot.toUpperCase()}`,
    both: 'Cả hai người',
    everyone: 'Mọi người',
    unassigned: 'Chưa gán',
    all: 'Tất cả',
    shared: 'Đi chung',
    filterLabel: 'Lọc theo người',
    departingFrom: (city) => `khởi hành từ ${city}`,
    from: (city) => `từ ${city}`,
  },

  activityType: {
    flight: 'Chuyến bay',
    transport: 'Di chuyển',
    food: 'Ăn uống',
    hotel: 'Chỗ ở',
    sleep: 'Ngủ',
    sightseeing: 'Tham quan',
    tour: 'Tour',
    prep: 'Chuẩn bị',
    arrival: 'Đến nơi',
    rest: 'Nghỉ ngơi',
    other: 'Hoạt động',
  },

  practical: {
    food: 'Ăn uống',
    toilet: 'Nhà vệ sinh',
    shower: 'Tắm rửa',
    sleep: 'Ngủ',
    recovery: 'Nghỉ hồi sức',
  },

  category: {
    flights: 'Chuyến bay',
    localTransport: 'Di chuyển tại chỗ',
    food: 'Ăn uống',
    lodging: 'Chỗ ở',
    tours: 'Tour & hoạt động',
    preparation: 'Chuẩn bị',
    other: 'Khác',
  },

  bookingStatus: {
    'not-started': 'Chưa bắt đầu',
    researching: 'Đang tìm hiểu',
    ready: 'Sẵn sàng đặt',
    booked: 'Đã đặt',
    confirmed: 'Đã xác nhận',
  },

  urgency: {
    now: 'Đặt ngay',
    '7-14': 'Đặt trước 7–14 ngày',
    '1-3': 'Đặt trước 1–3 ngày',
    arrival: 'Sắp xếp khi đến nơi',
    site: 'Trả tại chỗ',
    none: 'Không cần làm gì',
  },

  sheetRole: {
    overview: 'Tổng quan',
    itinerary: 'Lịch trình',
    bookings: 'Lựa chọn đặt chỗ',
    sources: 'Nguồn',
    budget: 'Chi phí',
    unknown: 'Không nhận ra',
  },

  confidence: {
    high: 'Độ chắc chắn cao',
    medium: 'Có phần suy đoán',
    low: 'Không chắc chắn',
  },

  severity: {
    critical: 'Nghiêm trọng',
    warning: 'Nên kiểm tra',
    info: 'Thông tin thêm',
  },

  assumption: {
    assumption: 'Giả định',
    recheck: 'Cần kiểm tra lại',
    verified: 'Đã xác minh',
    note: 'Ghi chú',
    exchangeRate: 'Tỷ giá',
  },

  scenario: {
    label: 'Kịch bản chi phí',
    base: 'Cơ bản',
    fallback: 'Dự phòng',
    baseLower: 'cơ bản',
    fallbackLower: 'dự phòng',
  },

  // ------------------------------------------------------------------ import
  import: {
    title: 'Tải lên bảng tính chuyến đi',
    intro:
      'Wayfare biến bảng tính kế hoạch của bạn thành hướng dẫn theo từng ngày. Hỗ trợ .xlsx và .xlsm, tối đa 20 MB.',
    dropHere: 'Kéo thả bảng tính vào đây',
    dropHint: 'hoặc chạm để chọn tệp · .xlsx, .xlsm tối đa 20 MB',
    trySample: 'Hoặc dùng thử bảng tính mẫu',
    reading: 'Đang đọc bảng tính…',
    progress: 'Tiến trình nhập tệp',
    steps: ['Đọc tệp', 'Nhận diện trang tính', 'Trích xuất dữ liệu', 'Hoàn tất'],
    stepDone: '— xong',
    stepInProgress: '— đang chạy',
    complete: 'Đã nhập xong',
    readFrom: (sheets, file) => `Đã đọc ${count(sheets, 'trang tính')} từ ${file}`,
    detectedSheets: 'Trang tính nhận diện được',
    readAs: (role) => `Đọc như ${role}`,
    notUsed: 'Không dùng',
    skipped: 'Đã bỏ qua',
    viewTrip: 'Xem chuyến đi',
    importAnother: 'Nhập bảng tính khác',
    reviewIssues: (n) => `Xem ${count(n, 'vấn đề dữ liệu')}`,
    chooseAnotherFile: 'Chọn tệp khác',
    partialTitle: 'Nhập chưa đầy đủ',
    partialBody:
      'Một phần bảng tính không đọc được. Những gì Wayfare hiểu được vẫn dùng được — xem mục Vấn đề dữ liệu để biết còn thiếu gì.',
    needsLook: (n) => `${count(n, 'mục')} cần xem lại — thiếu trường, giá trị không đọc được hoặc liên kết hỏng.`,
    privacyTitle: 'Dữ liệu của bạn ở lại đây',
    privacyBody:
      'Bảng tính được đọc hoàn toàn trong trình duyệt của bạn. Không có gì được tải lên và không phần nào được gửi đi đâu cả.',
    privacyStored:
      ' Chuyến đi Wayfare dựng ra được lưu trên thiết bị này để bạn quay lại sau, và bạn có thể xoá bất cứ lúc nào trong mục Thêm.',
    privacyUnavailable:
      ' Trình duyệt này không cho Wayfare lưu dữ liệu cục bộ, nên chuyến đi sẽ mất khi bạn đóng tab.',
    looksForTitle: 'Wayfare tìm những gì',
    looksForOverview: 'tên chuyến đi, ngày tháng, người đi, tỷ giá, tổng chi phí',
    looksForItinerary: 'mỗi dòng một hoạt động, kèm ngày, giờ, địa điểm và chi phí',
    looksForBookings: 'cần đặt gì, khi nào và giá bao nhiêu',
    looksForSources: 'các dữ kiện và giả định làm nền cho kế hoạch',
    aliasesNote:
      'Tên trang tính và tiêu đề cột không cần khớp chính xác — Wayfare nhận ra các cách viết thông dụng và sẽ cho bạn biết phần nào không xếp được.',
  },

  errors: {
    tooLarge: {
      title: 'Tệp lớn hơn 20 MB',
      detail:
        'Wayfare đọc toàn bộ bảng tính ngay trong trình duyệt nên không hỗ trợ tệp quá lớn. Hãy xoá bớt trang tính không dùng rồi xuất lại.',
    },
    empty: { title: 'Tệp rỗng', detail: 'Tệp không có nội dung. Hãy kiểm tra lại bản xuất và thử lần nữa.' },
    wrongFormat: {
      title: 'Wayfare đọc bảng tính .xlsx và .xlsm',
      detail: (file) =>
        `"${file}" không phải định dạng Wayfare đọc được. Trong Excel hoặc Google Sheets, hãy xuất ra .xlsx rồi thử lại.`,
    },
    unreadable: {
      title: 'Wayfare không đọc được bảng tính này',
      detail: 'Tệp có thể được đặt mật khẩu, bị hỏng, hoặc lưu ở định dạng cũ. Hãy lưu lại dưới dạng .xlsx.',
    },
    noSheets: {
      title: 'Bảng tính không có trang nào',
      detail: 'Hãy kiểm tra xem tệp đã xuất đúng chưa rồi thử lại.',
    },
    unexpected: {
      title: 'Wayfare không đọc được bảng tính này',
      detail: 'Có lỗi xảy ra khi đọc tệp. Hãy lưu lại dưới dạng .xlsx rồi tải lên lần nữa.',
    },
    boundaryTitle: 'Có lỗi khi hiển thị phần này',
    boundaryBody: 'Dữ liệu bảng tính của bạn không bị ảnh hưởng. Hãy thử lại hoặc quay lại chọn mục khác.',
    activityBoundary: 'Không hiển thị được hoạt động này',
  },

  // -------------------------------------------------------------------- home
  home: {
    departsIn: (days) => `Khởi hành sau ${count(days, 'ngày')}`,
    happeningNow: 'Đang diễn ra',
    nextUp: 'Tiếp theo',
    openNow: 'Mở hoạt động đang diễn ra',
    openNext: 'Mở hoạt động tiếp theo',
    issuesBanner: (n) => `${count(n, 'mục')} trong bảng tính cần xem lại.`,
    today: 'Hôm nay',
    nextDay: 'Ngày kế tiếp',
    fullDay: 'Cả ngày',
    nothingScheduled: 'Ngày này chưa có gì trong lịch.',
    tripSummary: 'Tóm tắt chuyến đi',
    baseBudget: 'Chi phí cơ bản',
    fallbackBudget: 'Chi phí dự phòng',
    vsFallback: 'so với dự phòng',
    bookingsStat: 'Đặt chỗ',
    destinationsMissing: 'Chưa có điểm đến',
    dayOfTotal: (day, total) => `Ngày ${day} / ${total}`,
    linkedFacts: (n) => count(n, 'dữ kiện liên kết'),
    doneSuffix: (label) => `${label} đã xong`,
    now: 'Bây giờ',
  },

  // --------------------------------------------------------------- itinerary
  itinerary: {
    tripDays: 'Các ngày trong chuyến đi',
    dayTabLabel: (date, day, total) => `${date}, ngày ${day} / ${total}`,
    hasIssues: 'Có vấn đề dữ liệu',
    undated: 'Hoạt động chưa có ngày',
    noDate: 'Không có ngày',
    timeNotGiven: 'Chưa có giờ',
    overnight: '+1 ngày',
    overnightShort: '+1',
    progressThroughDay: 'Tiến độ trong ngày',
    bookingNeeded: 'Cần đặt trước',
    emptyTitle: 'Chưa có hoạt động nào',
    emptyBody: 'Bảng tính không có dòng lịch trình nào Wayfare đọc được.',
    importWorkbook: 'Nhập bảng tính',
    nothingScheduled: 'Không có gì trong lịch',
    nothingScheduledBody: 'Ngày này không có hoạt động nào trong bảng tính.',
    nothingForTraveler: 'Không có gì cho người này',
    nothingForTravelerBody: (n) => `Ngày này có ${count(n, 'hoạt động')}, nhưng không mục nào thuộc bộ lọc đang chọn.`,
    showAllTravelers: 'Hiện tất cả mọi người',
    selectActivity: 'Chọn một hoạt động để xem chi tiết ở đây.',
    overlaps: (title) => `Trùng giờ với "${title}"`,
    startsImmediatelyAfter: (title) => `Bắt đầu ngay khi "${title}" kết thúc`,
    onlyMinutesAfter: (minutes, title) => `Chỉ cách "${title}" ${minutes} phút`,
  },

  activity: {
    notFound: 'Không tìm thấy hoạt động',
    notFoundBody: 'Có thể hoạt động này đến từ một bảng tính đã được thay thế.',
    backToItinerary: 'Quay lại lịch trình',
    unassignedWarning:
      'Bảng tính không ghi hoạt động này dành cho ai, nên nó hiện cho mọi người và không tính vào tổng của từng người.',
    durationDerived: 'Thời lượng được tính từ giờ bắt đầu và giờ kết thúc.',
    goodToKnow: 'Cần biết',
    practicalNeeds: 'Nhu cầu thực tế',
    booking: 'Đặt chỗ',
    openInBookings: 'Mở trong danh sách đặt chỗ',
    cost: 'Chi phí',
    sharedCost: (n) => `Chi phí chung — chia cho ${n} người trong tổng của từng người.`,
    whereFrom: 'Lấy từ đâu',
    showWhereFrom: 'Xem lấy từ đâu',
    fromSheetRow: (sheet, row) => `${sheet}, dòng ${row}`,
    rawTypeNote: (value) =>
      `Loại chặng trong bảng tính: “${value}” — Wayfare không nhận ra loại này nên dùng biểu tượng chung.`,
    openSourceLink: 'Mở liên kết nguồn',
    markDone: 'Đánh dấu đã xong',
    done: 'Đã xong',
    markedDone: 'Đã đánh dấu là xong',
    markedNotDone: 'Đã bỏ đánh dấu xong',
    doneOnDevice: 'Đã đánh dấu xong trên thiết bị này',
    share: 'Chia sẻ',
    copyDetails: 'Sao chép chi tiết',
    copied: 'Đã sao chép chi tiết hoạt động',
    copyFailed: 'Không sao chép được — trình duyệt đã chặn',
    navLabel: 'Điều hướng hoạt động',
    startOfTrip: 'Đầu chuyến đi',
    endOfTrip: 'Cuối chuyến đi',
    backToDay: (day) => `Quay lại ${day}`,
    noCost: 'Hoạt động này chưa ghi chi phí.',
  },

  // ------------------------------------------------------------------ budget
  budget: {
    title: 'Chi phí',
    emptyTitle: 'Không tìm thấy chi phí',
    emptyBody: 'Bảng tính không có số tiền nào Wayfare đọc được nên không có gì để cộng.',
    seeWhatMissed: 'Xem phần nào bị bỏ sót',
    groupTotal: 'Tổng cả nhóm',
    groupSub: (travelers, scenario) => `${count(travelers, 'người')} · kịch bản ${scenario}`,
    baseVsFallback: 'Cơ bản so với dự phòng',
    differenceAcrossTrip: 'Chênh lệch cho cả chuyến đi',
    noDifference: 'Không chênh lệch',
    perTraveler: 'Theo từng người',
    perTravelerNote:
      'Chi phí riêng của mỗi người tính đủ, cộng thêm phần chia đều của những mục đánh dấu đi chung. Hoạt động chưa gán người sẽ không được tính.',
    flightsVsShared: 'Chuyến bay so với chi phí chung',
    flights: 'Chuyến bay',
    sharedCosts: 'Chi phí chung',
    byCategory: 'Theo hạng mục',
    byCategoryLabel: (scenario) => `Chi tiêu theo hạng mục, kịch bản ${scenario}`,
    percentOfTotal: (percent) => `— ${percent}% tổng chi`,
    travelerSpecific: 'Chi phí riêng từng người',
    statedTitle: 'Ghi trong bảng tính của bạn',
    statedBudget: 'Ngân sách',
    statedPerTraveler: 'Mỗi người',
    statedGroupTotal: 'Tổng cả nhóm',
    statedNote:
      'Đây là các con số ghi trong trang Tổng quan, hiển thị đúng như bạn viết. Tổng của Wayfare ở trên được cộng từ lịch trình nên sẽ khác nếu con số trong bảng tính bao gồm những khoản chưa liệt kê.',
    exchangeRateLabel: 'Tỷ giá',
    exchangeRateNote: 'Lấy từ bảng tính của bạn và áp dụng cho mọi khoản quy đổi. Tỷ giá thực tế sẽ khác.',
    noExchangeRateLabel: 'Không có tỷ giá',
    noExchangeRateNote:
      'Bảng tính không ghi tỷ giá, nên các khoản bằng đơn vị tiền khác được giữ nguyên như đã viết và không cộng vào tổng.',
  },

  // ---------------------------------------------------------------- bookings
  bookings: {
    title: 'Danh sách đặt chỗ',
    progress: (done, total) => `Đã đặt ${done} / ${total}. Trạng thái bạn đặt chỉ lưu trên thiết bị này.`,
    progressLabel: (done, total) => `Tiến độ đặt chỗ: đã xong ${done} / ${total}`,
    emptyTitle: 'Chưa có mục đặt chỗ nào',
    emptyBody: 'Bảng tính không có trang đặt chỗ nào Wayfare đọc được.',
    searchLabel: 'Tìm trong danh sách đặt chỗ',
    filterAll: 'Tất cả',
    filterOutstanding: 'Còn phải đặt',
    filterDone: 'Đã đặt',
    filterByStatus: 'Lọc theo trạng thái',
    noneMatch: 'Không có mục nào khớp',
    noneMatchBody: 'Hãy thử từ khoá hoặc bộ lọc khác.',
    changeStatus: 'Đổi trạng thái',
    statusFor: (item) => `Trạng thái của ${item}`,
    openBookingPage: 'Mở trang đặt chỗ',
    target: 'Mục tiêu',
    fallback: 'Dự phòng',
    noTargetPrice: 'Chưa có giá mục tiêu',
    statusNoteTitle: 'Về trạng thái',
    statusNoteBody:
      'Wayfare đọc cột trạng thái trong bảng tính làm điểm khởi đầu. Mọi thay đổi ở đây được lưu trong trình duyệt và không bao giờ ghi ngược lại tệp của bạn.',
    statusChanged: (item, status) => `${item} — ${status}`,
  },

  // ----------------------------------------------------------------- sources
  sources: {
    title: 'Nguồn & giả định',
    intro:
      'Kế hoạch dựa trên điều gì, và mỗi phần chắc chắn đến đâu. Mục nào không có liên kết hoạt động đều được coi là giả định, không phải sự thật.',
    fromOverview: 'Từ trang Tổng quan',
    emptyTitle: 'Không tìm thấy nguồn nào',
    emptyBody: 'Bảng tính không có trang nguồn nào Wayfare đọc được, nên không có gì để đối chiếu kế hoạch.',
    seeDetectedSheets: 'Xem các trang tính nhận diện được',
    searchLabel: 'Tìm trong nguồn',
    searchPlaceholder: 'Tìm chủ đề và dữ kiện',
    filterByConfidence: 'Lọc theo độ chắc chắn',
    filterAll: 'Tất cả',
    kindVerified: 'Đã xác minh',
    kindAssumption: 'Giả định',
    kindRecheck: 'Cần kiểm tra lại',
    filterRecheck: 'Kiểm tra lại',
    noneMatch: 'Không có nguồn nào khớp',
    noneMatchBody: 'Hãy thử từ khoá hoặc bộ lọc khác.',
    untitledTopic: 'Chủ đề chưa đặt tên',
    linkAsWritten: (value) => `Liên kết như đã viết: ${value}`,
    howClassifiedTitle: 'Cách phân loại',
    howVerified: 'dòng đó có liên kết hoạt động để đối chiếu dữ kiện.',
    howAssumption: 'không có liên kết, hoặc dùng từ như “giả định”, “khoảng”.',
    howRecheck: 'liên kết không mở được, hoặc chính dòng đó ghi là chưa xác nhận.',
    recheckCount: (n) => `${count(n, 'nguồn')} vẫn cần kiểm tra lại trước khi bạn dựa vào.`,
  },

  // ------------------------------------------------------------------ issues
  issues: {
    title: 'Vấn đề dữ liệu',
    intro: (file) =>
      `Những phần Wayfare không đọc trọn vẹn từ ${file}. Tệp gốc của bạn không bao giờ bị thay đổi — đánh dấu đã xem chỉ ghi nhận trên thiết bị này.`,
    openTab: (n) => `Chưa xử lý (${n})`,
    reviewedTab: (n) => `Đã xem (${n})`,
    nothingReviewed: 'Chưa đánh dấu mục nào',
    nothingReviewedBody: 'Những mục bạn đánh dấu đã xem sẽ hiện ở đây.',
    nothingToFix: 'Không có gì cần sửa',
    nothingToFixBody: 'Wayfare đã đọc mọi trang tính trong bảng tính của bạn mà không gặp trở ngại.',
    backToTrip: 'Quay lại chuyến đi',
    openActivity: 'Mở hoạt động',
    markReviewed: 'Đánh dấu đã xem',
    markedReviewed: 'Đã đánh dấu là đã xem',
    moveBackToOpen: 'Chuyển lại thành chưa xử lý',
    movedBackToOpen: 'Đã chuyển lại thành chưa xử lý',
    cannotDismissCritical: 'Vấn đề nghiêm trọng không thể bỏ qua',
    sheetRow: (sheet, row) => `${sheet} · dòng ${row}`,
    whatToDoTitle: 'Nên làm gì với những mục này',
    whatToDoBody: (n) =>
      `Hãy sửa những chỗ quan trọng trong bảng tính rồi nhập lại — ${count(n, 'vấn đề')} được liệt kê kèm tên trang tính và số dòng để bạn tìm. Trạng thái đặt chỗ và hoạt động đã xong của bạn vẫn được giữ.`,
    reimport: 'Nhập lại bảng tính',
  },

  // -------------------------------------------------------------------- more
  more: {
    title: 'Thêm',
    appearance: 'Giao diện',
    theme: 'Chủ đề',
    themeSystem: 'Theo thiết bị',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeNote: 'Mặc định là nền sáng. Nền tối dễ chịu hơn khi bạn xem kế hoạch ngày mai vào buổi tối.',
    language: 'Ngôn ngữ',
    languageNote:
      'Chỉ đổi phần chữ của Wayfare. Nội dung bảng tính của bạn luôn hiển thị đúng như bạn đã viết.',
    importedWorkbook: 'Bảng tính đã nhập',
    file: 'Tệp',
    size: 'Dung lượng',
    imported: 'Nhập lúc',
    sheetsRead: 'Trang tính đã đọc',
    sheetsReadValue: (used, total) => `${used} / ${total}`,
    yourData: 'Dữ liệu của bạn',
    dataBody:
      'Bảng tính được đọc hoàn toàn trong trình duyệt này. Không có gì được tải lên và không có gì được gửi đi đâu cả.',
    dataStored:
      'Chuyến đi Wayfare dựng ra, cùng trạng thái đặt chỗ và các hoạt động đã xong, được lưu trên thiết bị này. Bản thân tệp gốc không được giữ lại.',
    dataUnavailable:
      'Trình duyệt này không cho Wayfare lưu dữ liệu cục bộ, nên chuyến đi chỉ nằm trong bộ nhớ tạm và sẽ mất khi bạn đóng tab.',
    currentlyStored: (days, bookings, changes) => `Đang lưu: ${days}, ${bookings}, ${changes}.`,
    statusChanges: (n) => count(n, 'thay đổi trạng thái'),
    clearData: 'Xoá dữ liệu chuyến đi',
    clearConfirmTitle: 'Xoá dữ liệu chuyến đi?',
    clearConfirmBody:
      'Thao tác này xoá chuyến đi đã nhập, trạng thái đặt chỗ và các hoạt động đã xong khỏi thiết bị này. Tệp bảng tính gốc của bạn không bị ảnh hưởng — bạn có thể nhập lại bất cứ lúc nào.',
    clearEverything: 'Xoá tất cả',
    cleared: 'Đã xoá dữ liệu chuyến đi',
    about: 'Giới thiệu',
    aboutBody:
      'Wayfare biến bảng tính kế hoạch chuyến đi thành hướng dẫn theo từng ngày để bạn dùng trên điện thoại. Ứng dụng không bao giờ sửa bảng tính của bạn và vẫn chạy được khi mất mạng sau lần tải đầu.',
  },

  offline: {
    offline: 'Ngoại tuyến',
    stale: 'Ngoại tuyến · đang hiện dữ liệu lưu gần nhất',
  },

  notFound: {
    title: 'Không tìm thấy trang',
    body: 'Liên kết này không khớp với phần nào trong Wayfare.',
    backToTrip: 'Quay lại chuyến đi của bạn',
  },

  loading: 'Đang tải chuyến đi của bạn',

  issueMessages: {
    emptySheet: (p) => ({
      title: `"${p.sheet}" không có dữ liệu`,
      detail: 'Trang tính này rỗng nên đã được bỏ qua.',
    }),
    unmappedSheet: (p) => ({
      title: `Không nhận ra "${p.sheet}"`,
      detail: `Wayfare không xác định được trang tính này chứa gì (phỏng đoán gần nhất: ${p.guess}). Không có nội dung nào từ đây xuất hiện trong chuyến đi.`,
    }),
    noItinerarySheet: () => ({
      title: 'Không tìm thấy trang lịch trình',
      detail:
        'Wayfare không xác định được trang tính chứa hoạt động theo ngày. Những phần khác nhận diện được vẫn đã nhập bình thường.',
    }),
    unconvertibleCosts: (p) => ({
      title: `${count(p.count, 'khoản chi')} không được tính vào tổng`,
      detail: `Không có tỷ giá cho ${p.currencies} → ${p.target}, nên các khoản này vẫn hiện ở từng mục nhưng không cộng vào tổng nào: ${p.labels}.`,
    }),
    unmappedColumns: (p) => ({
      title: `${count(p.count, 'cột')} không xếp được trong "${p.sheet}"`,
      detail: `Wayfare không nhận ra: ${p.columns}. Các cột này không hiện ở đâu trong chuyến đi.`,
    }),
    noHeaders: (p) => ({
      title: `Không tìm thấy tiêu đề cột trong "${p.sheet}"`,
      detail: 'Không xác định được dòng tiêu đề nên không nhập được gì từ trang tính này.',
    }),
    noActivityColumn: (p) => ({
      title: `Không có cột hoạt động trong "${p.sheet}"`,
      detail:
        'Wayfare không tìm thấy cột mô tả việc diễn ra (đã thử: hoạt động, mô tả, mục, tiêu đề). Các hoạt động được nhập dựa trên những cột khác khớp được.',
    }),
    invalidDate: (p) => ({
      title: 'Không đọc được ngày',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải ngày Wayfare nhận ra. Hoạt động vẫn được giữ nhưng xếp vào ngày trước đó.`,
    }),
    invalidStartTime: (p) => ({
      title: 'Không đọc được giờ bắt đầu',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải giờ Wayfare nhận ra.`,
    }),
    invalidEndTime: (p) => ({
      title: 'Không đọc được giờ kết thúc',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải giờ Wayfare nhận ra.`,
    }),
    durationConflict: (p) => ({
      title: 'Thời lượng không khớp với giờ',
      detail: `${p.sheet} dòng ${p.row} kéo dài qua nửa đêm (${p.start} → ${p.end}) nhưng ghi thời lượng là ${p.duration}. Cả hai giá trị đều được giữ nguyên như đã viết.`,
    }),
    invalidCost: (p) => ({
      title: 'Không đọc được chi phí',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải số tiền Wayfare nhận ra, nên không được tính vào chi phí.`,
    }),
    unknownCurrency: (p) => ({
      title: 'Không nhận ra đơn vị tiền',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải mã tiền tệ Wayfare nhận ra. Số tiền hiển thị mà không quy đổi.`,
    }),
    brokenUrlItinerary: (p) => ({
      title: 'Liên kết nguồn không dùng được',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} trông như một liên kết nhưng không mở được. Phần chữ vẫn được giữ lại trong hoạt động.`,
    }),
    unknownSegmentType: (p) => ({
      title: 'Không nhận ra loại chặng',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không khớp loại hoạt động nào đã biết. Nội dung hiện đúng như đã viết, kèm biểu tượng chung.`,
    }),
    duplicateActivity: (p) => ({
      title: 'Hoạt động trùng lặp',
      detail: `${p.sheet} dòng ${p.row} lặp lại "${p.title}" cùng ngày và giờ với dòng ${p.firstRow}. Cả hai đều được hiển thị.`,
    }),
    missingTraveler: (p) => ({
      title: 'Chưa gán người',
      detail: `"${p.title}" (${p.sheet} dòng ${p.row}) không ghi dành cho ai. Mục này hiện cho mọi người và không tính vào tổng của từng người.`,
    }),
    noActivitiesFound: (p) => ({
      title: `Không có hoạt động nào trong "${p.sheet}"`,
      detail: 'Trang tính được nhận diện là lịch trình nhưng mọi dòng dưới tiêu đề đều rỗng.',
    }),
    unknownBookingTiming: (p) => ({
      title: 'Không nhận ra thời điểm đặt',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không khớp mốc đặt chỗ nào đã biết, nên "${p.item}" được xếp vào "Không cần làm gì". Nội dung gốc vẫn hiện ở mục đó.`,
    }),
    unknownBookingStatus: (p) => ({
      title: 'Không nhận ra trạng thái đặt chỗ',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không khớp trạng thái nào đã biết, nên "${p.item}" bắt đầu ở trạng thái Chưa bắt đầu.`,
    }),
    brokenUrlBooking: (p) => ({
      title: 'Liên kết đặt chỗ không dùng được',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} trông như một liên kết nhưng không mở được.`,
    }),
    brokenUrlSource: (p) => ({
      title: 'Liên kết nguồn không dùng được',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} trông như một liên kết nhưng không mở được. Nguồn này được đánh dấu "Cần kiểm tra lại".`,
    }),
    fewerTravelers: (p) => ({
      title: 'Số người ít hơn con số đã ghi',
      detail: `Trang Tổng quan ghi ${p.stated} người nhưng chỉ nhận ra được ${p.found} người theo tên. Wayfare đã thêm người tạm.`,
    }),
    invalidTripDate: (p) => ({
      title: p.which === 'start' ? 'Không đọc được ngày bắt đầu chuyến đi' : 'Không đọc được ngày kết thúc chuyến đi',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải ngày Wayfare nhận ra. Ngày tháng được lấy từ lịch trình thay thế.`,
    }),
    invalidExchangeRate: (p) => ({
      title: 'Không đọc được tỷ giá',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không ở dạng Wayfare đọc được (cần dạng như "1 USD = 15,500 IDR"). Các khoản quy đổi sẽ không hiển thị.`,
    }),
    invalidBudgetFigure: (p) => ({
      title: 'Không đọc được con số chi phí',
      detail: `"${p.value}" ở ${p.sheet} dòng ${p.row} không phải số tiền Wayfare nhận ra. Tổng được tính từ lịch trình thay thế.`,
    }),
  } satisfies IssueRenderers,
};
