import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEMO_QUESTIONS = [
  {
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
  },
  {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
  },
];

export default function InteractiveDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = DEMO_QUESTIONS[currentIndex];

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return;
    
    setSelectedIndex(index);
    const correct = index === currentQuestion.correctIndex;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(s => s + 1);
    }
  };

  useEffect(() => {
    if (selectedIndex !== null) {
      const timer = setTimeout(() => {
        if (currentIndex < DEMO_QUESTIONS.length - 1) {
          setCurrentIndex(i => i + 1);
          setSelectedIndex(null);
          setIsCorrect(null);
        } else {
          // Last question - reset after delay
          setTimeout(() => {
            setCurrentIndex(0);
            setSelectedIndex(null);
            setIsCorrect(null);
            setScore(0);
          }, 2000);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, currentIndex]);

  const resetDemo = () => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setIsCorrect(null);
    setScore(0);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Score display */}
      <div className="flex justify-between items-center mb-6">
        <span className="font-display font-bold" style={{ color: 'var(--gum-500)' }}>
          Question {currentIndex + 1}/{DEMO_QUESTIONS.length}
        </span>
        <span className="font-display font-bold" style={{ color: 'var(--grape-500)' }}>
          Score: {score}
        </span>
      </div>

      {/* Question */}
      <motion.h3
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="font-display text-xl font-bold mb-6 text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        {currentQuestion.question}
      </motion.h3>

      {/* Options */}
      <div className="grid gap-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectAnswer = index === currentQuestion.correctIndex;
          const showFeedback = selectedIndex !== null;
          
          let className = 'option-btn transition-all duration-200';
          
          if (showFeedback) {
            if (isSelected && isCorrectAnswer) {
              className += ' correct';
            } else if (isSelected && !isCorrectAnswer) {
              className += ' wrong';
            } else if (isCorrectAnswer) {
              className += ' correct-hint';
            }
          }

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className={className}
              disabled={selectedIndex !== null}
              onClick={() => handleSelect(index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                scale: isSelected ? (isCorrectAnswer ? [1, 1.05, 1] : [1, 0.95, 1]) : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {option}
              {showFeedback && isCorrectAnswer && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="correct-badge"
                >
                  ✓
                </motion.span>
              )}
              {showFeedback && isSelected && !isCorrectAnswer && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="wrong-badge"
                >
                  ✗
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Reset button (appears after last question) */}
      <AnimatePresence>
        {selectedIndex !== null && currentIndex === DEMO_QUESTIONS.length - 1 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={resetDemo}
            className="btn-gum w-full mt-6"
          >
            Try Again
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
