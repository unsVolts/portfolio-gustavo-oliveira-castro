🎨 Blobmaker

https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white

📝 Descrição do Projeto

Blobmaker é uma aplicação web interativa desenvolvida como exercício de engenharia reversa do aplicativo Blobmaker. O objetivo foi recriar a lógica de geração de formas orgânicas do tipo blob – aquelas formas suaves, irregulares e com aspecto “gorduroso” – oferecendo controles precisos sobre número de vértices, complexidade, suavidade, cores e estilos visuais.

---

🚀 Tecnologias Utilizadas

· React 19 + TypeScript 5.8 – interface declarativa e tipagem estática
· Vite 6 – build e desenvolvimento ultrarrápido
· TailwindCSS 4 – estilização utilitária moderna
· Framer Motion – animações fluidas
· Lucide React – ícones leves
· clsx + tailwind-merge – composição de classes condicionais

---

📊 Funcionalidades e Diferenciais

· Geração de formas blob em tempo real
    Sliders para controle de número de vértices, irregularidade e suavidade – atualização instantânea.
· Personalização completa de cores
    Preenchimento sólido, gradientes lineares/radiais e cor da borda.
· Exportação SVG
    Copia o código SVG para a área de transferência ou faz download do arquivo .svg.
· Modo aleatório
    Botão que randomiza todos os parâmetros da forma, gerando blobs únicos a cada clique.
· Design responsivo e animado
    Interface adaptada para mobile/desktop com microinterações suaves.
· Código limpo e tipado
    Todo o projeto escrito em TypeScript, com componentes reutilizáveis e lógica de desenho SVG modular.

---

🔧 Como Executar

1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/formador-de-formas.git
   cd formador-de-formas
   ```
2. Instale as dependências
   ```bash
   npm install
   ```
3. Execute o servidor de desenvolvimento
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000
4. Build de produção
   ```bash
   npm run build
   npm run preview
   ```

---

Voltar ao início
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
