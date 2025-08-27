// app/account.tsx
import { UserContext } from '@/components/UserContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser } = useContext(UserContext);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.username || '');
  const [uploading, setUploading] = useState(false);

  // Change password UI state
  const [showPwForm, setShowPwForm] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const joinedLabel = formatJoined(getCreatedAt(user)) || '—';

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Incorrect Confirmation', 'You must type DELETE to confirm.');
      return;
    }
    try {
      setDeleteLoading(true);
      const res = await fetch('https://hypewave-ai-engine.onrender.com/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        Alert.alert('Error', err?.detail || 'Failed to delete account');
        return;
      }
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
      router.replace('/login');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveName = async () => {
    try {
      const token = user?.token;
      if (!token) return;

      const res = await fetch('https://hypewave-ai-engine.onrender.com/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newName }),
      });

      if (res.ok) {
        setUser({ ...user, username: newName });
        setEditingName(false);
      } else {
        const text = await res.text();
        console.warn('Failed to update username:', text);
        Alert.alert('Error', 'Could not update name.');
      }
    } catch (err) {
      console.error('Error updating username:', err);
      Alert.alert('Error', 'Could not update name.');
    }
  };

  const handleAvatarChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      try {
        setUploading(true);
        const asset = result.assets[0];
        const uri = asset.uri;

        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);

        const res = await fetch('https://hypewave-ai-engine.onrender.com/me/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.token}` },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Upload failed');
        }

        const data = await res.json();
        setUser({ ...user, avatar_url: data.avatar_url });
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to upload avatar');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!user?.token) return;
      if (!oldPw || !newPw || !confirmPw) {
        Alert.alert('Missing info', 'Please fill out all fields.');
        return;
      }
      if (newPw.length < 8) {
        Alert.alert('Weak password', 'New password must be at least 8 characters.');
        return;
      }
      if (newPw !== confirmPw) {
        Alert.alert('Mismatch', 'New password and confirm password do not match.');
        return;
      }

      setPwLoading(true);
      const res = await fetch('https://hypewave-ai-engine.onrender.com/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          old_password: oldPw,
          new_password: newPw,
          confirm_password: confirmPw,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          Alert.alert('Error', json.detail || 'Failed to change password');
        } catch {
          Alert.alert('Error', text || 'Failed to change password');
        }
        return;
      }

      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setShowPwForm(false);
      Alert.alert('Success', 'Password updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setPwLoading(false);
    }
  };

  function getCreatedAt(u: unknown): string | undefined {
    if (!u || typeof u !== "object") return undefined;
    const o = u as Record<string, unknown>;
    return (
      (o.created_at as string | undefined) ||
      (o.createdAt as string | undefined) ||
      (o.created as string | undefined) ||
      (o.createdOn as string | undefined)
    );
  }

  function formatJoined(iso?: string | null) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const hasCreated = !!getCreatedAt(user);
    if (hasCreated || !user?.token) return;

    (async () => {
      try {
        const res = await fetch('https://hypewave-ai-engine.onrender.com/me', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        console.log("Hydrated /me payload:", data); // <-- TEMP: verify field name
        // Merge; do not drop existing fields like token
        setUser({ ...user, ...data });
      } catch (e) {
        console.log("Hydrate /me failed", e);
      }
    })();
  }, [user?.token]); // we only need to run once when token exists


    // If a guest somehow lands here, kick them to chat
    if (user?.guest) {
      router.replace('/(tabs)/chat');
      return null;
    }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          position: 'absolute',
          top: 72,
          left: 24,
          backgroundColor: '#00163a',
          borderRadius: 20,
          padding: 8,
          zIndex: 50,
          elevation: 8,
        }}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>My Account</Text>

      {/* Joined date, centered meta 
      <View style={styles.joinedContainer}>
        <Text style={styles.joinedText}>
          {joinedLabel === '—' ? 'Joined date unavailable' : `Joined ${joinedLabel}`}
        </Text>
      </View>
      */}
      

      <View style={styles.card}>
        {/* Avatar row */}
        <TouchableOpacity style={styles.row} onPress={handleAvatarChange} disabled={uploading}>
          <Text style={styles.label}>Avatar</Text>
          {uploading ? (
            <Text style={styles.value}>Uploading...</Text>
          ) : (
            <Image
              source={
                user?.avatar_url
                  ? { uri: user.avatar_url }
                  : require('@/assets/icons/default-avatar.png')
              }
              style={styles.avatar}
            />
          )}
        </TouchableOpacity>

        {/* Email */}
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        {/* Display name */}
        <View style={styles.row}>
          <Text style={styles.label}>Display name</Text>
          {editingName ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#777"
              />
              <TouchableOpacity onPress={handleSaveName}>
                <Text style={[styles.value, { color: '#3ABEFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.value}>
                {user?.username || 'Trader'} {'>'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Change Password */}
        {!showPwForm ? (
          <TouchableOpacity style={styles.row} onPress={() => setShowPwForm(true)}>
            <Text style={styles.label}>Change Password</Text>
            <Text style={styles.value}>{'>'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ paddingVertical: 12, gap: 10 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Change Password</Text>

            {/* Old password */}
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                secureTextEntry={!showOld}
                value={oldPw}
                onChangeText={setOldPw}
                placeholder="Current password"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowOld(!showOld)} style={styles.eyeBtn}>
                <Ionicons name={showOld ? 'eye-off' : 'eye'} size={18} color="#bbb" />
              </TouchableOpacity>
            </View>

            {/* New password */}
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                secureTextEntry={!showNew}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="New password (min 8)"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off' : 'eye'} size={18} color="#bbb" />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                secureTextEntry={!showConfirm}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Confirm new password"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#bbb" />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowPwForm(false);
                  setOldPw('');
                  setNewPw('');
                  setConfirmPw('');
                }}
                disabled={pwLoading}
              >
                <Text style={[styles.value, { color: '#bbb' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangePassword} disabled={pwLoading}>
                <Text style={[styles.value, { color: pwLoading ? '#666' : '#3ABEFF' }]}>
                  {pwLoading ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Subscription */}
        <View style={styles.row}>
          <Text style={styles.label}>Subscription</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.subTag}>{user?.plan || 'Free'}</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#3ABEFF',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
              }}
              onPress={() => Alert.alert('Coming Soon', 'Pro tier will be available soon!')}
            >
              <Text style={{ color: '#000', fontSize: 11 }}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete account */}
        {!showDeleteConfirm ? (
          <TouchableOpacity style={styles.row} onPress={() => setShowDeleteConfirm(true)}>
            <Text style={styles.label}>Delete Your Account</Text>
            <Text style={styles.delete}>Delete</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ paddingVertical: 14, gap: 8 }}>
            <Text style={[styles.label, { color: 'red' }]}>
              Type DELETE to confirm account deletion:
            </Text>
            <TextInput
              style={styles.input}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="DELETE"
              placeholderTextColor="#777"
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                }}
              >
                <Text style={[styles.value, { color: '#bbb' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAccount} disabled={deleteLoading}>
                <Text style={[styles.value, { color: deleteLoading ? '#666' : 'red' }]}>
                  {deleteLoading ? 'Deleting…' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Image
          source={require('@/assets/icons/signals.png')}
          style={{ width: 200, height: 200, marginBottom: -10, marginTop: -20 }}
        />
        <Text style={{ color: '#ccc', fontSize: 24, marginBottom: 10 }}>Hypewave AI</Text>
        <Text style={{ color: '#444', fontSize: 12 }}>© {new Date().getFullYear()} Hypewave AI</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#00163a',
    flex: 1,
    paddingTop: 78,
    paddingHorizontal: 24,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#0b214e',
    borderRadius: 16,
    padding: 20,
    borderColor: '#3ABEFF',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomColor: '#1e2a47',
    borderBottomWidth: 1,
  },
  label: {
    color: 'white',
    fontSize: 14,
  },
  value: {
    color: '#aaa',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#112f5b',
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: 'white',
    fontSize: 14,
    minWidth: 80,
    borderRadius: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  subTag: {
    backgroundColor: '#020b33c0',
    color: '#eef9ffff',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 13,
  },
  delete: {
    color: 'red',
    fontSize: 14,
  },
  footer: {
    marginTop: 100,
    alignItems: 'center',
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  joinedContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  joinedText: {
    color: "#aaa",
    fontSize: 13,
    fontStyle: "italic",
  },
});
