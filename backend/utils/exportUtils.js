const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generates a PDF document for a workout plan
 * @param {Object} plan - The workout plan to export
 * @returns {Promise<string>} Path to the temporary PDF file
 */
const generatePDF = async (plan) => {
    const doc = new PDFDocument();
    const tempDir = os.tmpdir();
    const filename = `workout_plan_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, filename);

    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add title
        doc.fontSize(20).text('Workout Plan', { align: 'center' });
        doc.moveDown();

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

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
};

/**
 * Generates a CSV file for a workout plan
 * @param {Object} plan - The workout plan to export
 * @returns {Promise<string>} Path to the temporary CSV file
 */
const generateCSV = async (plan) => {
    const tempDir = os.tmpdir();
    const filename = `workout_plan_${Date.now()}.csv`;
    const filePath = path.join(tempDir, filename);

    // Flatten workout plan data
    const data = plan.schedule.flatMap(day => 
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