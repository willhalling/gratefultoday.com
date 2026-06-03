'use client';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Switch,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
  Slider,
  Checkbox,
  RadioGroup,
  Radio,
} from '@heroui/react';

export default function BrandTestPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-neutral-900">Brand Theme Test</h1>
          <p className="text-xl text-neutral-600">YouTube Card Tests - 16:9 Aspect Ratio</p>
        </div>

        {/* Color Swatches */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Color Palette</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-primary"></div>
                <p className="text-sm font-medium text-neutral-700">Primary</p>
                <p className="text-xs text-neutral-500">#15803d</p>
                <p className="text-xs text-neutral-400">Forest Green</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-secondary"></div>
                <p className="text-sm font-medium text-neutral-700">Secondary</p>
                <p className="text-xs text-neutral-500">#b45309</p>
                <p className="text-xs text-neutral-400">Warm Amber</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-accent"></div>
                <p className="text-sm font-medium text-neutral-700">Accent</p>
                <p className="text-xs text-neutral-500">#B1977C</p>
                <p className="text-xs text-neutral-400">Warm Taupe</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-neutral-600 border border-neutral-200"></div>
                <p className="text-sm font-medium text-neutral-700">Neutral Dark</p>
                <p className="text-xs text-neutral-500">#525252</p>
                <p className="text-xs text-neutral-400">Stone Gray</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-neutral-50 border border-neutral-200"></div>
                <p className="text-sm font-medium text-neutral-700">Neutral Light</p>
                <p className="text-xs text-neutral-500">#fafaf9</p>
                <p className="text-xs text-neutral-400">Off White</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* YouTube Cards - Text on Solid Backgrounds */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">YouTube Cards (16:9)</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary bg with dark text */}
              <div className="aspect-video bg-primary rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-neutral-900">Morning Gratitude</h3>
                  <p className="text-neutral-800">Primary bg / Dark text</p>
                </div>
              </div>

              {/* Primary bg with light text */}
              <div className="aspect-video bg-primary rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">Morning Gratitude</h3>
                  <p className="text-neutral-100">Primary bg / Light text</p>
                </div>
              </div>

              {/* Secondary bg with dark text */}
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-neutral-900">Daily Reflection</h3>
                  <p className="text-neutral-800">Secondary bg / Dark text</p>
                </div>
              </div>

              {/* Secondary bg with light text */}
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">Daily Reflection</h3>
                  <p className="text-neutral-100">Secondary bg / Light text</p>
                </div>
              </div>

              {/* Accent bg with dark text */}
              <div className="aspect-video bg-accent rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-neutral-900">Evening Thoughts</h3>
                  <p className="text-neutral-800">Accent bg / Dark text</p>
                </div>
              </div>

              {/* Accent bg with light text */}
              <div className="aspect-video bg-accent rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">Evening Thoughts</h3>
                  <p className="text-neutral-100">Accent bg / Light text</p>
                </div>
              </div>

              {/* Neutral-900 bg with light text */}
              <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">Mindful Moment</h3>
                  <p className="text-neutral-100">Neutral-900 bg / Light text</p>
                </div>
              </div>

              {/* Neutral-900 bg with secondary text */}
              <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-secondary">Mindful Moment</h3>
                  <p className="text-secondary-300">Neutral-900 bg / Secondary text</p>
                </div>
              </div>

              {/* Neutral-900 bg with primary text */}
              <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-primary">Mindful Moment</h3>
                  <p className="text-primary-300">Neutral-900 bg / Primary text</p>
                </div>
              </div>

              {/* Neutral-50 bg with dark text */}
              <div className="aspect-video bg-neutral-50 rounded-lg flex items-center justify-center p-6 border border-neutral-200">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-neutral-900">Grateful Heart</h3>
                  <p className="text-neutral-700">Neutral-50 bg / Dark text</p>
                </div>
              </div>

              {/* Neutral-50 bg with primary text */}
              <div className="aspect-video bg-neutral-50 rounded-lg flex items-center justify-center p-6 border border-neutral-200">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-primary">Grateful Heart</h3>
                  <p className="text-primary-700">Neutral-50 bg / Primary text</p>
                </div>
              </div>

              {/* Neutral-50 bg with accent text */}
              <div className="aspect-video bg-neutral-50 rounded-lg flex items-center justify-center p-6 border border-neutral-200">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-accent">Grateful Heart</h3>
                  <p className="text-accent-700">Neutral-50 bg / Accent text</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Buttons</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button color="primary" variant="solid">
                Primary Solid
              </Button>
              <Button color="primary" variant="bordered">
                Primary Bordered
              </Button>
              <Button color="primary" variant="light">
                Primary Light
              </Button>
              <Button color="secondary" variant="solid">
                Secondary Solid
              </Button>
              <Button color="secondary" variant="bordered">
                Secondary Bordered
              </Button>
              <Button color="default" variant="solid">
                Default Solid
              </Button>
              <Button color="success" variant="solid">
                Success
              </Button>
              <Button color="warning" variant="solid">
                Warning
              </Button>
              <Button color="danger" variant="solid">
                Danger
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-primary-200">
            <CardHeader className="bg-primary-50">
              <h3 className="text-lg font-bold text-primary-900">Primary Card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-700">
                Card with primary color scheme. Perfect for highlighting main features.
              </p>
            </CardBody>
          </Card>

          <Card className="border-secondary-200">
            <CardHeader className="bg-secondary-50">
              <h3 className="text-lg font-bold text-secondary-900">Secondary Card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-700">
                Card with secondary gold accent. Great for premium features.
              </p>
            </CardBody>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader className="bg-neutral-50">
              <h3 className="text-lg font-bold text-neutral-900">Neutral Card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-700">
                Card with neutral colors. Clean and minimal design.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Chips */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Chips</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Chip color="primary" variant="solid">
                Primary
              </Chip>
              <Chip color="primary" variant="bordered">
                Primary Bordered
              </Chip>
              <Chip color="primary" variant="dot">
                Primary Dot
              </Chip>
              <Chip color="secondary" variant="solid">
                Secondary
              </Chip>
              <Chip color="secondary" variant="bordered">
                Secondary
              </Chip>
              <Chip color="default" variant="solid">
                Default
              </Chip>
              <Chip color="success" variant="solid">
                Success
              </Chip>
              <Chip color="warning" variant="solid">
                Warning
              </Chip>
              <Chip color="danger" variant="solid">
                Danger
              </Chip>
            </div>
          </CardBody>
        </Card>

        {/* Form Elements */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Form Elements</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Primary Input" placeholder="Enter text..." color="primary" />
              <Input label="Secondary Input" placeholder="Enter text..." color="secondary" />
            </div>

            <div className="flex flex-wrap gap-6">
              <Switch color="primary">Primary Switch</Switch>
              <Switch color="secondary">Secondary Switch</Switch>
              <Checkbox color="primary">Primary Checkbox</Checkbox>
              <Checkbox color="secondary">Secondary Checkbox</Checkbox>
            </div>

            <RadioGroup label="Select an option" color="primary">
              <Radio value="option1">Option 1</Radio>
              <Radio value="option2">Option 2</Radio>
              <Radio value="option3">Option 3</Radio>
            </RadioGroup>

            <div className="space-y-4">
              <Slider
                label="Primary Slider"
                color="primary"
                defaultValue={50}
                className="max-w-md"
              />
              <Slider
                label="Secondary Slider"
                color="secondary"
                defaultValue={75}
                className="max-w-md"
              />
            </div>
          </CardBody>
        </Card>

        {/* Progress */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Progress Bars</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Progress label="Primary Progress" value={60} color="primary" className="max-w-md" />
            <Progress
              label="Secondary Progress"
              value={80}
              color="secondary"
              className="max-w-md"
            />
            <Progress label="Success Progress" value={100} color="success" className="max-w-md" />
          </CardBody>
        </Card>

        {/* Tabs */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Tabs</h2>
          </CardHeader>
          <CardBody>
            <Tabs color="primary" variant="solid">
              <Tab key="photos" title="Photos">
                <Card className="mt-4">
                  <CardBody>
                    <p className="text-neutral-700">Photos content goes here</p>
                  </CardBody>
                </Card>
              </Tab>
              <Tab key="music" title="Music">
                <Card className="mt-4">
                  <CardBody>
                    <p className="text-neutral-700">Music content goes here</p>
                  </CardBody>
                </Card>
              </Tab>
              <Tab key="videos" title="Videos">
                <Card className="mt-4">
                  <CardBody>
                    <p className="text-neutral-700">Videos content goes here</p>
                  </CardBody>
                </Card>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>

        {/* Modal */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Modal</h2>
          </CardHeader>
          <CardBody>
            <Button color="primary" onPress={onOpen}>
              Open Modal
            </Button>
            <Modal isOpen={isOpen} onClose={onClose}>
              <ModalContent>
                <ModalHeader className="text-neutral-900">Modal Title</ModalHeader>
                <ModalBody>
                  <p className="text-neutral-700">
                    This is a modal using our brand theme colors. Notice how the text and elements
                    use our Ebony, Moss Green, and Gold palette.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="light" onPress={onClose}>
                    Close
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    Confirm
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </CardBody>
        </Card>

        {/* Typography */}
        <Card className="border-neutral-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900">Typography</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <h1 className="text-4xl font-bold text-neutral-900">Heading 1</h1>
            <h2 className="text-3xl font-bold text-neutral-800">Heading 2</h2>
            <h3 className="text-2xl font-bold text-neutral-700">Heading 3</h3>
            <p className="text-lg text-neutral-600">
              Body text large - This is how larger body text appears with our theme.
            </p>
            <p className="text-base text-neutral-600">
              Body text default - Regular paragraph text using our neutral Ebony color.
            </p>
            <p className="text-sm text-neutral-500">
              Small text - Used for captions and secondary information.
            </p>
            <p className="text-primary font-medium">Primary colored text - Moss Green</p>
            <p className="text-secondary font-medium">Secondary colored text - Gold</p>
            <p className="text-accent font-medium">Accent colored text - Dark Goldenrod</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
