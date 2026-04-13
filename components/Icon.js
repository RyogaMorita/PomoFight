import { Image } from 'react-native'

const ICONS = {
  sword:    require('../assets/Wsord.png'),
  trophy:   require('../assets/tro.png'),
  door:     require('../assets/door.png'),
  profile:  require('../assets/profile.png'),
  home:     require('../assets/home.png'),
  key:      require('../assets/key.png'),
  internet: require('../assets/internet.png'),
  robot:    require('../assets/robot.png'),
  calendar: require('../assets/calender.png'),
  plant:    require('../assets/plant.png'),
  star:     require('../assets/star.png'),
  lock:     require('../assets/lock.png'),
  bell:     require('../assets/bell.png'),
  speaker:  require('../assets/speaker.png'),
}

export default function Icon({ name, size = 24, style }) {
  const source = ICONS[name]
  if (!source) return null
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  )
}
