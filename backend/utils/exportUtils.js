const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generates a PDF document for a workout or nutrition plan
 * @param {Object} plan - The workout or nutrition plan to export
 * @param {string} type - 'workout' or 'nutrition'
 * @returns {Promise<string>} Path to the temporary PDF file
 */
const generatePDF = async (plan, type) => {
    const doc = new PDFDocument();
    const tempDir = os.tmpdir();
    const filename = `${type}_plan_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, filename);

    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add title
        doc.fontSize(20).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Plan`, { align: 'center' });
        doc.moveDown();

        if (type === 'workout') {
            // Format workout plan
            doc.fontSize(16).text('Schedule');
            plan.schedule.forEach(day => {
                doc.fontSize(14).text(`Day: ${day.day}`);
                doc.fontSize(12).text(`Focus: ${day.focus}`);
                doc.moveDown();
                
                day.exercises.forEach(exercise => {
                    doc.fontSize(12).text(`Exercise: ${exercise.name}`);
                    doc.fontSize(10).text(`Sets: ${exercise.sets}`);
                    doc.fontSize(10).text(`Reps: ${exercise.reps}`);
                    doc.fontSize(10).text(`Rest: ${exercise.rest}`);
                    if (exercise.notes) {
                        doc.fontSize(10).text(`Notes: ${exercise.notes}`);
                    }
                    doc.moveDown();
                });
            });
        } else {
            // Format nutrition plan
            doc.fontSize(16).text('Daily Nutrition');
            doc.fontSize(12).text(`Calories: ${plan.dailyCalories}`);
            doc.moveDown();
            
            doc.fontSize(14).text('Macros');
            doc.fontSize(12).text(`Protein: ${plan.macros.protein}g`);
            doc.fontSize(12).text(`Carbs: ${plan.macros.carbs}g`);
            doc.fontSize(12).text(`Fats: ${plan.macros.fats}g`);
            doc.moveDown();

            doc.fontSize(14).text('Meals');
            plan.meals.forEach(meal => {
                doc.fontSize(12).text(`Meal: ${meal.name} (${meal.time})`);
                doc.fontSize(10).text(`Calories: ${meal.calories}`);
                doc.fontSize(10).text(`Protein: ${meal.macros.protein}g`);
                doc.fontSize(10).text(`Carbs: ${meal.macros.carbs}g`);
                doc.fontSize(10).text(`Fats: ${meal.macros.fats}g`);
                doc.moveDown();
            });
        }

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
};

/**
 * Generates a CSV file for a workout or nutrition plan
 * @param {Object} plan - The workout or nutrition plan to export
 * @param {string} type - 'workout' or 'nutrition'
 * @returns {Promise<string>} Path to the temporary CSV file
 */
const generateCSV = async (plan, type) => {
    const tempDir = os.tmpdir();
    const filename = `${type}_plan_${Date.now()}.csv`;
    const filePath = path.join(tempDir, filename);

    let data;
    if (type === 'workout') {
        // Flatten workout plan data
        data = plan.schedule.flatMap(day => 
            day.exercises.map(exercise => ({
                day: day.day,
                focus: day.focus,
                exercise: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                rest: exercise.rest,
                notes: exercise.notes || ''
            }))
        );
    } else {
        // Flatten nutrition plan data
        data = plan.meals.map(meal => ({
            meal: meal.name,
            time: meal.time,
            calories: meal.calories,
            protein: meal.macros.protein,
            carbs: meal.macros.carbs,
            fats: meal.macros.fats
        }));
    }

    const parser = new Parser();
    const csv = parser.parse(data);
    
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, csv, (err) => {
            if (err) reject(err);
            else resolve(filePath);
        });
    });
};

/**
 * Cleans up temporary files
 * @param {string} filePath - Path to the temporary file
 */
const cleanupTempFile = (filePath) => {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error('Error cleaning up temporary file:', err);
    }
};

module.exports = {
    generatePDF,
    generateCSV,
    cleanupTempFile
}; 