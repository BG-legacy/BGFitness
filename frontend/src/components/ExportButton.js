import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/ExportButton.css';

const ExportButton = ({ data, type, filename }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(`${type === 'workout' ? 'Workout' : 'Nutrition'} Plan`, 14, 15);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    // Add content based on type
    if (type === 'workout') {
      exportWorkoutToPDF(doc, data);
    } else if (type === 'nutrition') {
      exportNutritionToPDF(doc, data);
    }

    doc.save(`${filename}.pdf`);
  };

  const exportWorkoutToPDF = (doc, workoutData) => {
    const tableData = workoutData.exercises.map(exercise => [exercise.name, exercise.sets, exercise.reps, exercise.rest]);

    autoTable(doc, {
      startY: 35,
      head: [['Exercise', 'Sets', 'Reps', 'Rest']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 226] },
    });
  };

  const exportNutritionToPDF = (doc, nutritionData) => {
    const tableData = nutritionData.meals.map(meal => [meal.name, meal.calories, meal.protein, meal.carbs, meal.fats]);

    autoTable(doc, {
      startY: 35,
      head: [['Meal', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 226] },
    });
  };

  const exportToCSV = () => {
    let csvContent = '';

    if (type === 'workout') {
      csvContent = 'Exercise,Sets,Reps,Rest\n';
      data.exercises.forEach(exercise => {
        csvContent += `${exercise.name},${exercise.sets},${exercise.reps},${exercise.rest}\n`;
      });
    } else if (type === 'nutrition') {
      csvContent = 'Meal,Calories,Protein (g),Carbs (g),Fats (g)\n';
      data.meals.forEach(meal => {
        csvContent += `${meal.name},${meal.calories},${meal.protein},${meal.carbs},${meal.fats}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <div className="export-buttons">
      <button onClick={exportToPDF} className="export-button" title="Download as PDF document">
        Download PDF
      </button>
      <button onClick={exportToCSV} className="export-button" title="Download as CSV spreadsheet">
        Download CSV
      </button>
    </div>
  );
};

export default ExportButton;
