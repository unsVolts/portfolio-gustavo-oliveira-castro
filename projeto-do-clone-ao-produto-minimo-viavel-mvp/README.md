🎨 Molda Forma

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

📝 Descrição do Projeto

Molda Forma é uma ferramenta criativa para gerar e personalizar formas orgânicas e geométricas no formato SVG. O projeto nasceu como um exercício de engenharia reversa do Blobmaker, evoluindo para um produto autoral com diferenciais competitivos.

A proposta foi ir além da replicação: inovar utilizando IA como copiloto de desenvolvimento e Firebase como infraestrutura escalável. O resultado é uma aplicação que não só recria a lógica de geração de blobs, mas também oferece:

* **Replica**
![replica](./images/image1.png)

* **Produto Minimo Viável (MVP)**
  
* **Modos Orgânico e Geométrico (polígonos e estrelas)**
* orgânico
![organico](./images/image2.png)
controles organico
![controles organico](./images/image3.png)
geométrico (polígono)
![geométrico polígono](./images/image4.png)
controles polígono 
![controles polígono](./images/image5.png)
geométrico (estrelas)
![geométrico estrelas](./images/image6.png)
controles estrelas
![controles estrelas](./images/image7.png)
  
* **Sistema de padrões e texturas (listras, pontos, xadrez, ondas)**
* listras
![listras](./images/image8.png)
pontos
![pontos](./images/image9.png)
xadrez
![xadrez](./images/image10.png)
ondas
![ondas](./images/image11.png)
controles textura
![controles textura](./images/image12.png)
  
* Geração por IA via Google Gemini – basta descrever o que você quer
* prompt 1
![prompt1](./images/image13.png)
prompt 2
![prompt2](./images/image14.png)
  
* Autenticação e salvamento na nuvem (Firebase Auth + Firestore)
  
* Acessibilidade (alto contraste e filtros para daltonismo)
* menu de acessibilidade
![menu](./images/image15.png)
acessibilidade desligada
![desligado](./images/image16.png)
alto contrastre ligado
![alto contraste](./images/image17.png)
filtro de protonopia ligado
![protonopia](./images/image18.png)
filtro de deuteranopia ligado
![deuteranopia](./images/image19.png)
filtro de tritanopia ligado
![tritanopia](./images/image20.png)
filtro de acromatopsia
![acromatopsia](./images/image21.png)

* Exportação em SVG e PNG
![exportação e salvamento em nuvem](./images/image22.png)

---

🚀 Tecnologias Utilizadas

* **React 19 + TypeScript 5.8 –** interface declarativa e tipagem estática
* **Vite 6 –** build e desenvolvimento ultrarrápido
* **TailwindCSS 4 –** estilização utilitária moderna
* **Framer Motion –** animações fluidas
* **Lucide React –** ícones leves
* **Firebase –** Auth, Firestore e regras de segurança
* **Google Gemini API –** geração de formas por comando em linguagem natural

---

📊 Funcionalidades e Diferenciais (Além do Blobmaker original)

O projeto implementa 4+ recursos inovadores que não existiam na ferramenta de referência:

* **1. Modo Geométrico –** Polígonos regulares e estrelas com controles de lados, raio interno e rotação.
* **2. Padrões e Texturas –** Listras, pontos, xadrez, ondas e ruído, totalmente configuráveis (escala, rotação, densidade, cor).
* **3. Geração por IA (Gemini) –** Descreva a forma desejada em português ou inglês, e a IA ajusta os parâmetros automaticamente (modo, complexidade, cores, padrões, etc.).
* **4. Acessibilidade Integrada –** Modo de alto contraste e filtros de simulação de daltonismo (protanopia, deuteranopia, tritanopia, acromatopsia).
* **5. Backend com Firebase –** Login social (Google), salvamento de formas favoritas na nuvem e coleção pessoal.

Além disso, mantém todas as funcionalidades clássicas:

* Controle de complexidade e irregularidade (modo orgânico)
* Personalização de cores (paleta ou código hexadecimal)
* Rotação da forma
* Exportação SVG/PNG e cópia do código
* Modo aleatório com um clique
* Interface responsiva e animada

---

🔧 Como Executar

1. Clone o repositório.
2. Instale as dependências: npm install.
3. Configure as variáveis de ambiente (se houver):
   · Crie um arquivo .env na raiz.
   · Adicione sua chave da API Gemini: GEMINI_API_KEY=sua_chave_aqui
   · (Opcional) Configure Firebase: substitua as credenciais em firebase-applet-config.json ou crie um arquivo .env com as variáveis do Firebase.
4. Execute o servidor de desenvolvimento: npm run dev.
5. Para gerar a versão de produção: npm run build.

---

[Voltar ao início]
(https://github.com/unsVolts/portfolio-gustavo-oliveira-castro)
