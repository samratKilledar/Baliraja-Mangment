export type CheckinRecord = {
  studentId: string;
  studentName: string;
  morningAt: string | null;
  nightAt: string | null;
};

let records: CheckinRecord[] = [
  {
    studentId: 'demo-1001',
    studentName: 'Aarav Jadhav',
    morningAt: '2026-03-08T08:12:00.000Z',
    nightAt: null
  },
  {
    studentId: 'demo-1002',
    studentName: 'Sakshi Shinde',
    morningAt: null,
    nightAt: null
  }
];

const listeners = new Set<(next: CheckinRecord[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(records));
}

export function getCheckinRecords() {
  return records;
}

export function subscribeCheckinRecords(listener: (next: CheckinRecord[]) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStudentCheckin(studentId: string, studentName: string, slot: 'morning' | 'night') {
  const now = new Date().toISOString();
  const idx = records.findIndex((item) => item.studentId === studentId);
  if (idx === -1) {
    records = [
      ...records,
      {
        studentId,
        studentName,
        morningAt: slot === 'morning' ? now : null,
        nightAt: slot === 'night' ? now : null
      }
    ];
    emit();
    return;
  }
  records = records.map((item, i) => {
    if (i !== idx) return item;
    if (slot === 'morning') return { ...item, studentName, morningAt: now };
    return { ...item, studentName, nightAt: now };
  });
  emit();
}
