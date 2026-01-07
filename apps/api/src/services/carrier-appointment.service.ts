import { CarrierAppointment } from '@prisma/client';
import { prisma } from '../infra/prisma.js';

export class CarrierAppointmentService {
  /**
   * Creates a new carrier appointment for an agent
   */
  async createAppointment(agentId: string, carrierId: string, appointmentData: any): Promise<CarrierAppointment> {
    return prisma.carrierAppointment.create({
      data: {
        agentId,
        carrierId,
        carrierName: appointmentData.carrierName,
        appointmentDate: appointmentData.appointmentDate || new Date(),
        authorizedLines: appointmentData.authorizedLines || [],
        appointmentStatus: 'Active',
        complianceStatus: 'Compliant',
      },
    });
  }

  /**
   * Updates an existing appointment
   */
  async updateAppointment(appointmentId: string, updates: any): Promise<CarrierAppointment> {
    return prisma.carrierAppointment.update({
      where: { id: appointmentId },
      data: updates,
    });
  }

  /**
   * Terminates an appointment
   */
  async terminateAppointment(appointmentId: string, reason: string, effectiveDate: Date = new Date()): Promise<void> {
    await prisma.carrierAppointment.update({
      where: { id: appointmentId },
      data: {
        appointmentStatus: 'Terminated',
        terminationDate: effectiveDate,
        violations: {
          push: `Terminated: ${reason}`,
        },
      },
    });
  }

  /**
   * Validates an appointment
   */
  async validateAppointment(appointmentId: string): Promise<boolean> {
    const appointment = await prisma.carrierAppointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) return false;

    return (
      appointment.appointmentStatus === 'Active' &&
      appointment.complianceStatus === 'Compliant' &&
      (!appointment.terminationDate || appointment.terminationDate > new Date())
    );
  }

  /**
   * Checks carrier compliance for an agent
   */
  async checkCarrierCompliance(agentId: string, carrierId: string): Promise<boolean> {
    const appointment = await prisma.carrierAppointment.findUnique({
      where: {
        agentId_carrierId: {
          agentId,
          carrierId,
        },
      },
    });

    return appointment?.complianceStatus === 'Compliant';
  }

  /**
   * Gets all appointments for an agent
   */
  async getAgentAppointments(agentId: string): Promise<CarrierAppointment[]> {
    return prisma.carrierAppointment.findMany({
      where: { agentId },
    });
  }

  /**
   * Lists all appointments for a carrier
   */
  async listAppointmentsByCarrier(carrierId: string): Promise<CarrierAppointment[]> {
    return prisma.carrierAppointment.findMany({
      where: { carrierId },
    });
  }
}
