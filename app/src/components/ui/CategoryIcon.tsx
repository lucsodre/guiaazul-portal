// Maps category icon names (from Ionicons/iOS) to a colored circle with a letter/emoji fallback
// Since we can't use Ionicons in the browser, we render a colored circle with the initial

interface CategoryIconProps {
  name?: string
  color?: string
  size?: number
}

const ICON_MAP: Record<string, string> = {
  'restaurant-outline': '🍽️',
  'car-outline': '🚗',
  'home-outline': '🏠',
  'medical-outline': '⚕️',
  'school-outline': '📚',
  'cart-outline': '🛒',
  'phone-portrait-outline': '📱',
  'shirt-outline': '👕',
  'fitness-outline': '💪',
  'game-controller-outline': '🎮',
  'airplane-outline': '✈️',
  'musical-notes-outline': '🎵',
  'paw-outline': '🐾',
  'cash-outline': '💵',
  'card-outline': '💳',
  'wallet-outline': '👛',
  'briefcase-outline': '💼',
  'trending-up-outline': '📈',
  'gift-outline': '🎁',
  'construct-outline': '🔧',
  'water-outline': '💧',
  'flash-outline': '⚡',
  'wifi-outline': '📶',
  'tv-outline': '📺',
  'book-outline': '📖',
  'heart-outline': '❤️',
  'pricetag-outline': '🏷️',
  'help-circle-outline': '❓',
  'swap-horizontal-outline': '↔️',
  'arrow-up-circle-outline': '⬆️',
  'arrow-down-circle-outline': '⬇️',
}

export default function CategoryIcon({ name, color = '#94A3B8', size = 40 }: CategoryIconProps) {
  const emoji = name ? (ICON_MAP[name] || '🏷️') : '🏷️'
  const fontSize = Math.round(size * 0.44)

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      backgroundColor: color + '25',
      border: `2px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, flexShrink: 0,
    }}>
      {emoji}
    </div>
  )
}
