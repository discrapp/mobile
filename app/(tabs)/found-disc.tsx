import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function FoundDiscScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Found a Disc?</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={styles.description}>Report a found disc here to help reunite it with its owner.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
