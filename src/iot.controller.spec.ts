import { IotController } from './iot.controller';

describe('IotController', () => {
  let controller: IotController;

  beforeEach(() => {
    controller = new IotController();
  });

  it('should print payload in console', () => {
    const payload = { heartRate: 88 };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const response = controller.receiveVitals(payload);

    expect(consoleSpy).toHaveBeenCalledWith(payload);
    expect(response).toEqual({ message: 'Vitals recibidos' });

    consoleSpy.mockRestore();
  });
});
