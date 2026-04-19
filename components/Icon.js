import { Image } from 'react-native'

const ICONS = {
  sword:    require('../assets/sprite/Wsord.png'),
  trophy:   require('../assets/sprite/tro.png'),
  door:     require('../assets/sprite/door.png'),
  profile:  require('../assets/sprite/profile.png'),
  home:     require('../assets/sprite/home.png'),
  key:      require('../assets/sprite/key.png'),
  internet: require('../assets/sprite/internet.png'),
  robot:    require('../assets/sprite/robot.png'),
  calendar: require('../assets/sprite/calender.png'),
  plant:    require('../assets/sprite/plant.png'),
  star:     require('../assets/sprite/star.png'),
  lock:     require('../assets/sprite/lock.png'),
  bell:     require('../assets/sprite/bell.png'),
  speaker:  require('../assets/sprite/speaker.png'),
  friends:  require('../assets/sprite/friends.png'),
  analize:  require('../assets/sprite/analize.png'),
  setting:  require('../assets/sprite/setting.png'),
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
