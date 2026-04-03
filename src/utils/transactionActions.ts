import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { Transaction } from '../types';

/**
 * Long-press menu: Edit or Delete (delete confirms in a second alert).
 */
export function showTransactionActionMenu(
  tx: Transaction,
  title: string,
  onEdit: () => void,
  onDelete: () => void,
): void {
  const confirmDelete = () => {
    Alert.alert(
      'Delete transaction?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Edit', 'Delete'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 2,
        userInterfaceStyle: 'dark',
        title,
      },
      buttonIndex => {
        if (buttonIndex === 1) onEdit();
        if (buttonIndex === 2) confirmDelete();
      },
    );
  } else {
    Alert.alert(
      title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit details', onPress: onEdit },
        { text: 'Delete permanently', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }
}
