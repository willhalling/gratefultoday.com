'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Textarea, Card, CardBody, CardHeader, Checkbox } from '@heroui/react';
import { Plus, Trash2, FileText } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export default function InvoiceGeneratorPage() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEPKBuilder, setIsEPKBuilder] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, price: 0 },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Format month and year from invoice date
  const getMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle EPKBuilder checkbox toggle
  useEffect(() => {
    if (isEPKBuilder) {
      setCustomerName('Alex Tobias Muldoon');
      setCustomerEmail('tobmuldo.dev@gmail.com');
      setCustomerCompany('EPKBuilder LLC');
      setCustomerAddress('490 Double Hill rd. Eastsound Wa 98245, USA');
      setLineItems([
        {
          id: '1',
          description: `Software Development Services - ${getMonthYear(invoiceDate)}`,
          quantity: 1,
          price: 0,
        },
      ]);
    } else {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerCompany('');
      setCustomerAddress('');
      setLineItems([{ id: '1', description: '', quantity: 1, price: 0 }]);
    }
  }, [isEPKBuilder, invoiceDate]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, price: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceNumber || !customerName || !customerEmail) {
      alert('Please fill in invoice number, customer name, and email');
      return;
    }

    setIsGenerating(true);
    try {
      await generateInvoicePDF({
        invoiceNumber,
        invoiceDate,
        dueDate: new Date(new Date(invoiceDate).getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Invoice Generator</h1>
            <p className="text-lg text-neutral-600">Create professional PDF invoices</p>
          </div>

          <Card className="border border-neutral-200">
            <CardBody className="p-6">
              {/* EPKBuilder Quick Fill */}
              <div className="mb-6 pb-6 border-b border-neutral-200">
                <Checkbox
                  isSelected={isEPKBuilder}
                  onValueChange={setIsEPKBuilder}
                  size="lg"
                  color="primary"
                >
                  <span className="font-semibold">EPKBuilder LLC</span>
                  <span className="text-sm text-neutral-600 ml-2">
                    (Auto-fill customer details and revenue share agreement)
                  </span>
                </Checkbox>
              </div>

              {/* Invoice Details */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Invoice Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Invoice Number"
                    placeholder="INV-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                  />
                  <Input
                    label="Invoice Date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Customer Details */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Customer Details</h2>
                <div className="space-y-4">
                  <Input
                    label="Customer Name"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Company Name"
                    placeholder="Company LLC"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                  />
                  <Textarea
                    label="Address"
                    placeholder="123 Main Street, London, SW1A 1AA"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    minRows={3}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-neutral-900">Line Items</h2>
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onClick={addLineItem}
                  >
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <Card key={item.id} className="border border-neutral-200">
                      <CardBody className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-12 md:col-span-5">
                            <Input
                              label="Description"
                              placeholder="Service or product description"
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(item.id, 'description', e.target.value)
                              }
                              size="sm"
                            />
                          </div>
                          <div className="col-span-5 md:col-span-2">
                            <Input
                              label="Qty"
                              type="number"
                              min="1"
                              value={item.quantity.toString()}
                              onChange={(e) =>
                                updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              size="sm"
                            />
                          </div>
                          <div className="col-span-5 md:col-span-3">
                            <Input
                              label="Price (£)"
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price.toString()}
                              onChange={(e) =>
                                updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)
                              }
                              size="sm"
                            />
                            {isEPKBuilder && (
                              <p className="text-xs text-neutral-500 mt-1">
                                (50% revenue share per agreement)
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 md:col-span-2 flex items-end">
                            <div className="text-right w-full">
                              <p className="text-xs text-neutral-600 mb-1">Total</p>
                              <p className="font-semibold">
                                £{(item.quantity * item.price).toFixed(2)}
                              </p>
                            </div>
                            {lineItems.length > 1 && (
                              <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                isIconOnly
                                onClick={() => removeLineItem(item.id)}
                                className="ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-neutral-200 pt-4 mb-6">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-neutral-600 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-neutral-900">
                      £{calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button
                  size="lg"
                  color="primary"
                  startContent={<FileText className="w-5 h-5" />}
                  onClick={handleGenerateInvoice}
                  isLoading={isGenerating}
                  isDisabled={!invoiceNumber || !customerName || !customerEmail}
                >
                  Generate PDF Invoice
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
