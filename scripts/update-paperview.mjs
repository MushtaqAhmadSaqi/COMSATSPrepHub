import fs from 'fs';

let content = fs.readFileSync('src/pages/PaperView/PaperView.jsx', 'utf8');

if (!content.includes('import MathText')) {
  content = content.replace(
    "import './PaperView.css';",
    "import MathText from '../../components/MathText/MathText';\nimport './PaperView.css';"
  );
}

// Replace QuestionText
content = content.replace(
  /function QuestionText\(\{ text \}\) \{[\s\S]*?return \(\s*<div className="paperview-question-content">[\s\S]*?<\/div>\s*\);\s*\}/,
  'function QuestionText({ text }) {\n  return <MathText text={text} className="paperview-question-content" />;\n}'
);

// Replace MarkdownAnswer
content = content.replace(
  /function MarkdownAnswer\(\{ text \}\) \{[\s\S]*?return <div className="paperview-md-body">\{elements\}<\/div>;\s*\}/,
  'function MarkdownAnswer({ text }) {\n  return <MathText text={text} className="paperview-md-body" />;\n}'
);

fs.writeFileSync('src/pages/PaperView/PaperView.jsx', content, 'utf8');
console.log('Successfully updated PaperView.jsx with MathText');

