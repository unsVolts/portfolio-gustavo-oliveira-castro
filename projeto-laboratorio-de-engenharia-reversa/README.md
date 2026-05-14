# 🎨 Blobmaker

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

## 📝 Descrição do Projeto
O **Formador de Formas** é um aplicativo interativo de alta performance que permite criar e personalizar formas geométricas com cores, estilos e animações únicas. Inspirado em ferramentas de design como o *blobmaker.app*, o projeto oferece um ambiente criativo onde designers e desenvolvedores podem explorar combinações visuais de forma instantânea.

Diferencial do projeto: integração com a API **Google Gemini**, que fornece sugestões inteligentes de paletas de cores, variações de forma e estilos criativos, elevando a experiência do usuário com auxílio de IA generativa. As formas geradas podem ser exportadas como SVG otimizado ou código pronto para uso em projetos web.

---

## 🚀 Tecnologias Utilizadas
* **Frontend:** React 19 + TypeScript + Vite
* **IA Generativa:** Google Gemini API (`@google/genai`)
* **Estilização:** Tailwind CSS (utilitária + design responsivo)
* **Animações:** Framer Motion (transições suaves e morphing)
* **Ícones:** Lucide-React
* **Servidor (desenvolvimento):** Express (para roteamento simples)
* **Exportação:** Blob API (download de arquivos) e Clipboard API (cópia de código SVG)

## 📊 Funcionalidades e Diferenciais
* **Motor de Formas Geométricas:** Geração dinâmica de polígonos regulares, estrelas e formas orgânicas por curvas de Bézier cúbicas.
* **Personalização Visual:** Controle de cor de preenchimento, gradiente, traçado (stroke), opacidade e sombras via Tailwind.
* **Sugestões com IA:** Ao clicar em “Inspirar com Gemini”, o app consulta a API da Google Gemini para recomendar uma combinação de cor + estilo + complexidade da forma.
* **Morphing Reativo:** Transições animadas entre estados de forma e cor com física de mola (spring physics).
* **Exportação Limpa:** Código SVG otimizado, sem atributos desnecessários, com `viewBox="0 0 200 200"` e pronto para uso em Figma, Adobe XD ou código HTML.
* **Design Responsivo:** Interface totalmente adaptada para desktop e tablets.

## 🔧 Como Executar
1. Clone este repositório.
2. Instale as dependências: `npm install`.
3. Configure sua chave da API Gemini:
   - Crie um arquivo `.env` na raiz do projeto.
   - Adicione: `GEMINI_API_KEY=sua_chave_aqui`
4. Execute o servidor de desenvolvimento: `npm run dev`.
5. Para gerar a versão de produção: `npm run build`.

---
[Voltar ao início](https://github.com/seu-usuario/seu-repositorio)
