# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Gerar o app instalável (EAS Build)

O `eas.json` tem dois perfis:

| Perfil | Gera | Para quê |
| --- | --- | --- |
| `preview` | APK (Android) / build interna (iOS) | Instalar direto nos celulares da academia, na homologação |
| `production` | AAB (Android) / build da App Store (iOS) | Publicar na Google Play e na App Store |

Primeira vez (precisa de uma conta gratuita em [expo.dev](https://expo.dev)):

```bash
npm install -g eas-cli
eas login
eas init            # liga o projeto à conta e grava o projectId no app.json
```

O app precisa saber o endereço do servidor publicado. Cadastre a variável em cada ambiente (troque pela URL real da API):

```bash
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://SUA-API --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://SUA-API --visibility plaintext
```

Gerar os instaláveis:

```bash
eas build --profile preview --platform android     # APK: o link da build instala direto no celular
eas build --profile production --platform android  # AAB para a Google Play
eas build --profile production --platform ios      # exige conta Apple Developer
```

O identificador do app está em `app.json` (`com.lsgfit.app`); troque antes da primeira publicação se quiser outro.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
