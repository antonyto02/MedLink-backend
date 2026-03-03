import { IotController } from './iot.controller';
import { IotGateway } from './iot.gateway';

describe('IotController', () => {
  let controller: IotController;
  let gateway: IotGateway;

  beforeEach(() => {
    gateway = { emitVitals: jest.fn() } as unknown as IotGateway;
    controller = new IotController(gateway);
  });

  it('should emit vitals via gateway', () => {
    const payload = { heartRate: 88 };

    const response = controller.receiveVitals(payload);

    expect(gateway.emitVitals).toHaveBeenCalledWith(payload);
    expect(response).toEqual({ message: 'Vitals recibidos' });
  });
});
