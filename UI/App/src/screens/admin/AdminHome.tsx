import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DashboardScreen from '../../components/DashboardScreen';
import {
  approveLeaveByAdmin,
  Complaint,
  getAdminStaffAttendanceRows,
  getAdminAttendanceRows,
  getAllComplaints,
  getLeaveRequests,
  LeaveRequest,
  subscribePortalStore
} from '../../store/studentPortalStore';

const filters = ['today', 'pending admissions', 'fees due'];

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(filters[0]);
  const [complaints, setComplaints] = useState<Complaint[]>(getAllComplaints());
  const [studentAttendanceRows, setStudentAttendanceRows] = useState(getAdminAttendanceRows());
  const [staffAttendanceRows, setStaffAttendanceRows] = useState(getAdminStaffAttendanceRows());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(getLeaveRequests());

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    const unsub = subscribePortalStore(() => {
      setComplaints([...getAllComplaints()]);
      setStudentAttendanceRows(getAdminAttendanceRows());
      setStaffAttendanceRows(getAdminStaffAttendanceRows());
      setLeaveRequests([...getLeaveRequests()]);
    });
    return () => unsub();
  }, []);

  return (
    <DashboardScreen
      title="Admin Dashboard"
      subtitle="Admissions, students, fees, teachers, course batches."
      role="admin"
      loading={loading}
      loadingLabel="Loading admin operations..."
      filter={filter}
      filters={filters}
      onFilterChange={setFilter}
    >
      <View style={styles.box}>
        <Text style={styles.heading}>Student Attendance (Today)</Text>
        {studentAttendanceRows.map((item) => (
          <View key={item.studentId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.studentName}</Text>
              <Text style={styles.subtext}>Check-in: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : '--'}</Text>
              <Text style={styles.subtext}>Check-out: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : '--'}</Text>
            </View>
            <Text style={[styles.status, { color: item.available ? '#0f7d49' : '#cf2d2d' }]}>
              {item.available ? 'In Campus' : 'Absent/Out'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Staff Attendance (Today)</Text>
        {staffAttendanceRows.map((item) => (
          <View key={item.staffId} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.staffName} ({item.designation})</Text>
              <Text style={styles.subtext}>Subject: {item.subject}</Text>
              <Text style={styles.subtext}>Check-in: {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : '--'}</Text>
              <Text style={styles.subtext}>Check-out: {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : '--'}</Text>
            </View>
            <Text style={[styles.status, { color: item.available ? '#0f7d49' : '#cf2d2d' }]}>
              {item.available ? 'Present' : 'Absent/Out'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Student Leave Approval</Text>
        {leaveRequests.length === 0 ? <Text style={styles.subtext}>No leave requests.</Text> : null}
        {leaveRequests.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.studentName} ({item.studentId})</Text>
              <Text style={styles.subtext}>Reason: {item.reason}</Text>
              <Text style={styles.subtext}>Applied: {item.applyDate}</Text>
              <Text style={styles.subtext}>From: {item.fromDateTime}</Text>
              <Text style={styles.subtext}>To: {item.toDateTime}</Text>
              <Text style={[styles.subtext, { fontWeight: '700' }]}>Duration: {item.durationLabel}</Text>
              <Text style={[styles.subtext, { color: item.status === 'approved' ? '#0f7d49' : '#cf2d2d', fontWeight: '700' }]}>
                Status: {item.status.toUpperCase()} {item.approvedBy ? `(By ${item.approvedBy})` : ''}
              </Text>
            </View>
            {item.status === 'pending' ? (
              <Pressable style={styles.approveBtn} onPress={() => approveLeaveByAdmin(item.id, 'Admin')}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.box}>
        <Text style={styles.heading}>Complaint Inbox</Text>
        {complaints.length === 0 ? <Text style={styles.subtext}>No complaints submitted yet.</Text> : null}
        {complaints.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.studentName} ({item.studentId})</Text>
              <Text style={styles.subtext}>{item.message}</Text>
              <Text style={styles.subtext}>Time: {new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Text style={[styles.status, { color: '#cf2d2d' }]}>{item.status.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7dff6',
    borderRadius: 12,
    backgroundColor: '#f9fbff',
    padding: 12
  },
  heading: {
    color: '#1f2f75',
    fontWeight: '800'
  },
  row: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dfe5f6',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff'
  },
  name: {
    color: '#22316a',
    fontWeight: '700'
  },
  subtext: {
    marginTop: 2,
    color: '#5e688f'
  },
  status: {
    fontWeight: '800'
  },
  approveBtn: {
    borderWidth: 1,
    borderColor: '#b8e1c9',
    backgroundColor: '#e8f8ef',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  approveBtnText: {
    color: '#0f7d49',
    fontWeight: '800'
  }
});
