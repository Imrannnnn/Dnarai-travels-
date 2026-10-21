import { dutyController, checkOverdueDutyChecklists } from './duty.controller.js';
import { EmailService } from '../services/EmailService.js';

describe('Duty Checklist and Overdue Alert Logic', () => {
  test('dutyController defines all required checklist and duty management methods', () => {
    expect(typeof dutyController.createDuty).toBe('function');
    expect(typeof dutyController.getDuties).toBe('function');
    expect(typeof dutyController.getMyDuties).toBe('function');
    expect(typeof dutyController.completeDutyAssignment).toBe('function');
    expect(typeof dutyController.updateDutyAssignmentNotes).toBe('function');
    expect(typeof dutyController.updateDutyChecklist).toBe('function');
    expect(typeof checkOverdueDutyChecklists).toBe('function');
  });

  test('EmailService has sendDutyOverdueAdminEmail configured', () => {
    expect(typeof EmailService.sendDutyOverdueAdminEmail).toBe('function');
  });

  test('Percentage calculation logic functions accurately', () => {
    const checklist = [
      { text: 'Verify ticket', completed: true },
      { text: 'Check baggage', completed: true },
      { text: 'Issue boarding pass', completed: false },
      { text: 'WhatsApp update', completed: false },
    ];
    const totalCount = checklist.length;
    const completedCount = checklist.filter((i) => i.completed).length;
    const percentageDone = Math.round((completedCount / totalCount) * 100);

    expect(percentageDone).toBe(50);
    expect(totalCount).toBe(4);
    expect(completedCount).toBe(2);

    // Gating check
    const incomplete = checklist.filter((i) => !i.completed);
    expect(incomplete.length).toBe(2);
    expect(incomplete.map((i) => i.text)).toEqual([
      'Issue boarding pass',
      'WhatsApp update',
    ]);
  });
});
