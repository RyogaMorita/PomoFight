import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import FriendSection from './FriendSection'
import Icon from './Icon'
import { colors, radius } from '../lib/theme'

export default function FriendModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="friends" size={22} />
            <Text style={styles.title}>フレンド</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.body}>
          <FriendSection />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 22, color: colors.textSub },
  body: { flex: 1, padding: 20 },
})
