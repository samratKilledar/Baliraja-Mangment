import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import client from '../../api/client';
import COLORS from '../../config/colors';

type ReferenceMode = 'create' | 'list';

type ReferenceItem = {
  _id: string;
  studentName: string;
  mobileNo: string;
  address: string;
  note?: string;
  source?: 'android' | 'web';
  createdBy?: { fullName?: string; role?: string };
  createdByRole?: string;
  createdAt: string;
};

export default function ReferenceScreen({ mode = 'create' as ReferenceMode }) {
  const [studentName, setStudentName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadReferences = useCallback(async (nextQuery = '') => {
    if (mode !== 'list') return;
    setLoading(true);
    try {
      const { data } = await client.get('/references', {
        params: {
          q: nextQuery.trim() || undefined,
          page: 1,
          limit: 50
        }
      });
      setItems(data?.items || []);
      setError('');
    } catch (err: any) {
      setItems([]);
      setError(err?.response?.data?.message || 'Unable to load references');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'list') {
      loadReferences('');
    }
  }, [loadReferences, mode]);

  async function submit() {
    if (mode !== 'create') return;
    if (!studentName.trim() || !mobileNo.trim() || !address.trim()) {
      setError('Student name, mobile and address are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await client.post('/references', {
        studentName: studentName.trim(),
        mobileNo: mobileNo.trim(),
        address: address.trim(),
        note: note.trim(),
        source: 'android'
      });
      setStudentName('');
      setMobileNo('');
      setAddress('');
      setNote('');
      setSuccess('Reference submitted successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to submit reference');
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (mode === 'list') {
        await loadReferences(query);
      } else {
        setError('');
        setSuccess('');
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'create' ? 'Reference Form' : 'Reference Inbox'}</Text>
          {mode === 'create' ? (
            <>
              <TextInput
                style={styles.input}
                value={studentName}
                onChangeText={setStudentName}
                placeholder="Name of student"
                placeholderTextColor={COLORS.textGray}
              />
              <TextInput
                style={styles.input}
                value={mobileNo}
                onChangeText={setMobileNo}
                placeholder="Mobile no"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textGray}
              />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={COLORS.textGray}
              />
              <TextInput
                style={[styles.input, styles.note]}
                value={note}
                onChangeText={setNote}
                placeholder="Note (optional)"
                placeholderTextColor={COLORS.textGray}
                multiline
              />
              <Pressable style={styles.submitBtn} onPress={submit} disabled={saving}>
                <Text style={styles.submitText}>{saving ? 'Submitting...' : 'Submit Reference'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  loadReferences(text);
                }}
                placeholder="Search name, mobile, address, note"
                placeholderTextColor={COLORS.textGray}
              />
              {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} /> : null}
              {!loading && items.length === 0 ? <Text style={styles.muted}>No references found.</Text> : null}
              {items.map((item) => (
                <View key={item._id} style={styles.row}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name}>{item.studentName}</Text>
                    <Text style={styles.badge}>{item.source === 'android' ? 'Android' : 'Web'}</Text>
                  </View>
                  <Text style={styles.text}>Mobile: {item.mobileNo}</Text>
                  <Text style={styles.text}>Address: {item.address}</Text>
                  {item.note ? <Text style={styles.text}>Note: {item.note}</Text> : null}
                  <Text style={styles.meta}>
                    By {item.createdBy?.fullName || item.createdByRole || 'Unknown'} • {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    padding: 16
  },
  title: {
    color: COLORS.textDark,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    paddingHorizontal: 12,
    marginTop: 10
  },
  note: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: 12
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  muted: {
    color: COLORS.textGray,
    marginTop: 12
  },
  row: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.light,
    padding: 12
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  name: {
    color: COLORS.textDark,
    fontWeight: '700',
    fontSize: 16
  },
  badge: {
    color: COLORS.primary,
    backgroundColor: COLORS.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  text: {
    color: COLORS.text,
    marginTop: 4
  },
  meta: {
    color: COLORS.textGray,
    marginTop: 6,
    fontSize: 12
  },
  error: {
    color: COLORS.danger,
    marginTop: 12,
    fontWeight: '700'
  },
  success: {
    color: COLORS.success,
    marginTop: 12,
    fontWeight: '700'
  }
});
