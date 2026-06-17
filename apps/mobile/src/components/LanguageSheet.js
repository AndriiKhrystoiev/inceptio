// LanguageSheet — bottom-sheet language selector for the YouScreen "Language"
// row. Sibling of ActivityChangeSheet: it follows the exact same modal pattern
// (backdrop + sheet as absolute/flex-end siblings, inline styles per the
// Modal-content convention documented in ActivityChangeSheet.js /
// DatePickerScreen.js) so the two selectors feel identical.
//
// Options come from the i18n SUPPORTED list (single source of truth) and are
// labelled with their native endonym from LANGUAGE_LABELS. No flags — es-419
// and pt-BR are regional variants. The active language gets the accent ring +
// a check mark (mirrors ActivityOption's selected ring).
//
// Stateless: the parent (YouScreen) owns open/current and applies the choice
// (i18n.changeLanguage + persist) in onSelect. Tapping the already-active
// language is a no-op, matching ActivityChangeSheet.
//
// The sheet title is passed in as `title` (a t()'d string) so no user-facing
// literal lives in this component.

import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { SUPPORTED, LANGUAGE_LABELS } from '../i18n/locale';

/**
 * LanguageSheet
 *
 * @param {{
 *   open: boolean,
 *   current: string,            // active bundle key (e.g. 'en', 'es-419')
 *   title: string,              // localized sheet heading
 *   onSelect: (bundle: string) => void,
 *   onClose: () => void,
 * }} props
 */
export function LanguageSheet({ open, current, title, onSelect, onClose }) {
  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop — tap to dismiss without selecting. */}
        <Pressable
          testID="language-sheet-backdrop"
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />

        {/* Sheet body — inline styles per Modal-content convention. */}
        <View
          testID="language-sheet-body"
          style={{
            backgroundColor: '#1F1838',        // bg-surface
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#3A3258',          // border-soft
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            gap: 12,
          }}
        >
          <Text
            className="font-display-reg text-cream"
            style={{ fontSize: 20, lineHeight: 26, marginBottom: 4 }}
          >
            {title}
          </Text>

          {SUPPORTED.map((bundle) => {
            const selected = bundle === current;
            return (
              <Pressable
                key={bundle}
                testID={`language-option-${bundle}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  // Tapping the active language is a visual affordance only.
                  if (bundle !== current) onSelect(bundle);
                }}
                className="active:opacity-[0.92]"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  borderRadius: 16,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? '#8B6FE8' : '#3A3258', // accent-primary / border-soft
                  backgroundColor: '#2A2247',                    // bg-elevated
                }}
              >
                <Text className="font-ui-med text-[17px] leading-[22px] text-cream">
                  {LANGUAGE_LABELS[bundle]}
                </Text>
                {selected ? (
                  <Check color="#8B6FE8" size={20} strokeWidth={2} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

export default LanguageSheet;
