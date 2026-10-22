import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/services/api';
import type { Exercise } from '@/types/exercise';

type ExerciseMediaProps = {
  exercise: Exercise;
};

// RF03/RF08: demonstracao visual (video e/ou GIF) + instrucoes em texto.
// RNF06: so e montado quando o aluno abre a demonstracao; a GIF fica em cache
// no aparelho, entao nas proximas vezes abre sem baixar de novo.
export function ExerciseMedia({ exercise }: ExerciseMediaProps) {
  const theme = useTheme();
  const videoUrl = resolveMediaUrl(exercise.videoUrl);
  const gifUrl = resolveMediaUrl(exercise.gifUrl);
  const isLibraryGif = Boolean(exercise.gifUrl?.startsWith('/media/'));

  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  const [isGifLoading, setIsGifLoading] = useState(Boolean(gifUrl));
  const [gifFailed, setGifFailed] = useState(false);

  const hasMedia = Boolean(videoUrl || (gifUrl && !gifFailed));

  return (
    <View style={styles.container}>
      {videoUrl && (
        <VideoView
          player={player}
          style={[styles.video, { backgroundColor: theme.backgroundElement }]}
          contentFit="contain"
          nativeControls
        />
      )}

      {gifUrl && !gifFailed && (
        <View style={styles.gifFrame}>
          <Image
            source={{ uri: gifUrl }}
            style={styles.gif}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
            accessibilityLabel={`Demonstração do exercício ${exercise.name}`}
            onLoad={() => setIsGifLoading(false)}
            onError={() => {
              setIsGifLoading(false);
              setGifFailed(true);
            }}
          />
          {isGifLoading && <ActivityIndicator color={theme.accentText} style={StyleSheet.absoluteFill} />}
        </View>
      )}

      {isLibraryGif && !gifFailed && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.credit}>
          Animação: ExerciseDB por AscendAPI (ascendapi.com)
        </ThemedText>
      )}

      {!hasMedia && (
        <ThemedText type="small" themeColor="textSecondary">
          {gifFailed
            ? 'Não foi possível carregar a demonstração. Verifique sua conexão.'
            : 'Vídeo/GIF de demonstração ainda não disponível para este exercício.'}
        </ThemedText>
      )}

      {exercise.instructions ? (
        <ThemedText type="small" style={styles.instructions}>
          {exercise.instructions}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Instruções de execução ainda não cadastradas.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.medium,
  },
  // As GIFs da biblioteca sao pequenas (180x180) e com fundo branco: um quadro
  // quadrado de tamanho limitado evita que fiquem borradas ao esticar.
  gifFrame: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: Radius.medium,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  gif: {
    width: '100%',
    height: '100%',
  },
  credit: {
    fontSize: 11,
    textAlign: 'center',
  },
  instructions: {
    lineHeight: 20,
  },
});
