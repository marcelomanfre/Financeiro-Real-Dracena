import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/Financeiro-Real-Dracena/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // O HMR está desativado no AI Studio através da variável de ambiente DISABLE_HMR.
      // Não modifique o monitoramento de arquivos para evitar oscilações durante as edições do agente.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Desativar o monitoramento de arquivos quando DISABLE_HMR for verdadeiro para economizar CPU durante edições do agente.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});