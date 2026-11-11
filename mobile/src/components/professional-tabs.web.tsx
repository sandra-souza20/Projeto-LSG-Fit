import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';

import { CustomTabList, TabButton } from './app-tabs.web';

// Versao web da barra do profissional (mesmo visual da do aluno).
export default function ProfessionalTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Alunos</TabButton>
          </TabTrigger>
          <TabTrigger name="exercise-library" href="/exercise-library" asChild>
            <TabButton>Biblioteca</TabButton>
          </TabTrigger>
          <TabTrigger name="professional-profile" href="/professional-profile" asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}
